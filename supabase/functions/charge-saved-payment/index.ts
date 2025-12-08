import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHARGE-SAVED-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { paymentMethodId, amount, description, releaseId, type } = await req.json();
    logStep("Request body", { paymentMethodId, amount, description, releaseId, type });

    if (!paymentMethodId) throw new Error("Payment method ID is required");
    if (!amount || amount <= 0) throw new Error("Valid amount is required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No payment methods on file. Please add a card first.");
    }
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Verify payment method belongs to customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== customerId) {
      throw new Error("Payment method does not belong to this customer");
    }
    logStep("Payment method verified", { brand: paymentMethod.card?.brand, last4: paymentMethod.card?.last4 });

    // Create and confirm PaymentIntent off-session
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'cad',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description,
      metadata: {
        user_id: user.id,
        release_id: releaseId || '',
        type: type || 'payment',
      },
    });
    logStep("PaymentIntent created and confirmed", { 
      paymentIntentId: paymentIntent.id, 
      status: paymentIntent.status 
    });

    // If payment succeeded and it's a release payment, update release status
    if (paymentIntent.status === 'succeeded' && type === 'release' && releaseId) {
      await supabaseClient
        .from('releases')
        .update({ status: 'pending' })
        .eq('id', releaseId);
      logStep("Release status updated to pending", { releaseId });
    }

    // If payment succeeded and it's a takedown payment, update release status
    if (paymentIntent.status === 'succeeded' && type === 'takedown' && releaseId) {
      await supabaseClient
        .from('releases')
        .update({ 
          takedown_requested: true,
          status: 'takedown_requested'
        })
        .eq('id', releaseId);
      logStep("Release takedown requested", { releaseId });
    }

    return new Response(JSON.stringify({
      success: paymentIntent.status === 'succeeded',
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in charge-saved-payment", { message: errorMessage });

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return new Response(JSON.stringify({ 
        error: error.message,
        code: error.code,
        decline_code: error.decline_code,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 402,
      });
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
