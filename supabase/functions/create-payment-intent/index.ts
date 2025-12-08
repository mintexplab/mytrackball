import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${detailsStr}`);
};

// Pricing in cents (CAD)
const TRACK_FEE_CENTS = 500; // $5 CAD per track
const UPC_FEE_CENTS = 800; // $8 CAD UPC fee

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
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { trackCount, releaseTitle, releaseId } = await req.json();
    if (!trackCount || trackCount < 1) throw new Error("Track count is required and must be at least 1");
    if (!releaseTitle) throw new Error("Release title is required");
    if (!releaseId) throw new Error("Release ID is required");
    logStep("Request data received", { trackCount, releaseTitle, releaseId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      // Create customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
      logStep("Customer created", { customerId });
    }

    // Calculate fees
    const trackTotal = TRACK_FEE_CENTS * trackCount;
    const totalAmount = trackTotal + UPC_FEE_CENTS;

    logStep("Calculated fees", { 
      trackCount, 
      trackTotal: trackTotal / 100, 
      upcFee: UPC_FEE_CENTS / 100, 
      total: totalAmount / 100 
    });

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "cad",
      customer: customerId,
      metadata: {
        user_id: user.id,
        release_id: releaseId,
        track_count: trackCount.toString(),
        release_title: releaseTitle,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logStep("PaymentIntent created", { paymentIntentId: paymentIntent.id });

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      paymentIntentId: paymentIntent.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-payment-intent", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
