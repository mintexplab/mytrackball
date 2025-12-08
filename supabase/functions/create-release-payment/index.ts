import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-RELEASE-PAYMENT] ${step}${detailsStr}`);
};

// Pricing tiers (CAD in cents)
const PRICING = {
  eco: { trackFee: 100, upcFee: 400 }, // $1/track, $4 UPC
  standard: { trackFee: 500, upcFee: 800 }, // $5/track, $8 UPC
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
    const publishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY") || Deno.env.get("VITE_STRIPE_PUBLISHABLE_KEY");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!publishableKey) throw new Error("STRIPE_PUBLISHABLE_KEY is not set");
    logStep("Stripe keys verified");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { trackCount, releaseTitle, releaseId, pricingTier = "standard" } = await req.json();
    if (!trackCount || !releaseTitle) throw new Error("Track count and release title are required");
    logStep("Request data received", { trackCount, releaseTitle, releaseId, pricingTier });

    const pricing = PRICING[pricingTier as keyof typeof PRICING] || PRICING.standard;
    const totalAmount = (pricing.trackFee * trackCount) + pricing.upcFee;
    logStep("Calculated pricing", { trackCount, pricingTier, totalAmount });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Create payment intent for in-dashboard payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "cad",
      customer: customerId,
      metadata: {
        releaseId: releaseId || "",
        releaseTitle,
        trackCount: String(trackCount),
        pricingTier,
        type: "release_distribution",
        userId: user.id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logStep("Payment intent created", { paymentIntentId: paymentIntent.id, amount: totalAmount });

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      publishableKey,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-release-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});