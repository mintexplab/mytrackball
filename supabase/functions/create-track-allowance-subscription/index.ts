import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-TRACK-ALLOWANCE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { tracksPerMonth, paymentMethodId } = await req.json();
    if (!tracksPerMonth || tracksPerMonth < 1) throw new Error("Invalid tracks per month");
    logStep("Tracks per month received", { tracksPerMonth });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculate monthly fee with tiered pricing:
    // $4 CAD per track for 5-45 tracks, $2 CAD per track for 46+ tracks
    const pricePerTrack = tracksPerMonth > 45 ? 200 : 400; // in cents
    const monthlyAmount = tracksPerMonth * pricePerTrack;
    logStep("Monthly amount calculated", { pricePerTrack: pricePerTrack / 100, monthlyAmount: monthlyAmount / 100 });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      // Create new customer
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = newCustomer.id;
      logStep("New customer created", { customerId });
    }

    // If payment method provided, use it to create subscription directly
    if (paymentMethodId) {
      logStep("Using saved payment method", { paymentMethodId });
      
      // Attach payment method to customer if not already attached
      try {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      } catch (e: any) {
        // Payment method might already be attached
        if (!e.message?.includes("already been attached")) {
          logStep("Payment method already attached or error", { error: e.message });
        }
      }

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });

      // Create or get product for Track Allowance
      const productsList = await stripe.products.list({ active: true, limit: 100 });
      let product = productsList.data.find((p: { name: string }) => p.name === "Track Allowance Plan");
      
      if (!product) {
        product = await stripe.products.create({
          name: "Track Allowance Plan",
          description: "Monthly track allowance subscription - $4/track (5-45), $2/track (46+)"
        });
        logStep("Created Track Allowance product", { productId: product.id });
      }

      // Create a custom price for this subscription
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: monthlyAmount,
        currency: "cad",
        recurring: { interval: "month" },
        nickname: `Track Allowance - ${tracksPerMonth} tracks/month`,
        metadata: {
          tracks_per_month: String(tracksPerMonth)
        }
      });
      logStep("Created custom price", { priceId: price.id, amount: monthlyAmount });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: price.id }],
        default_payment_method: paymentMethodId,
        metadata: {
          user_id: user.id,
          tracks_per_month: String(tracksPerMonth),
          type: "track_allowance"
        }
      });

      logStep("Subscription created", { subscriptionId: subscription.id });

      // Update user profile with subscription info
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabaseAdmin.from("profiles").update({
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId
      }).eq("id", user.id);

      return new Response(JSON.stringify({ 
        success: true, 
        subscriptionId: subscription.id,
        tracksPerMonth,
        monthlyAmount: monthlyAmount / 100
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // No payment method - create checkout session
    // Create or get product for Track Allowance
    const productsList = await stripe.products.list({ active: true, limit: 100 });
    let product = productsList.data.find((p: { name: string }) => p.name === "Track Allowance Plan");
    
    if (!product) {
      product = await stripe.products.create({
        name: "Track Allowance Plan",
        description: "Monthly track allowance subscription - $4/track (5-45), $2/track (46+)"
      });
    }

    // Create a custom price for this checkout
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: monthlyAmount,
      currency: "cad",
      recurring: { interval: "month" },
      nickname: `Track Allowance - ${tracksPerMonth} tracks/month`,
      metadata: {
        tracks_per_month: String(tracksPerMonth)
      }
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?tab=subscription&success=true`,
      cancel_url: `${req.headers.get("origin")}/dashboard?tab=subscription&canceled=true`,
      metadata: {
        user_id: user.id,
        tracks_per_month: String(tracksPerMonth),
        type: "track_allowance"
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tracks_per_month: String(tracksPerMonth),
          type: "track_allowance"
        }
      }
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
