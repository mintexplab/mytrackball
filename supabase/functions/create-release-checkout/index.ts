import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-RELEASE-CHECKOUT] ${step}${detailsStr}`);
};

// Pricing in cents (CAD) by tier
const PRICING = {
  eco: { trackFee: 100, upcFee: 400 },    // $1 CAD per track, $4 UPC
  standard: { trackFee: 500, upcFee: 800 }, // $5 CAD per track, $8 UPC
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
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { trackCount, releaseTitle, releaseId, pricingTier = "standard" } = await req.json();
    if (!trackCount || trackCount < 1) throw new Error("Track count is required and must be at least 1");
    if (!releaseTitle) throw new Error("Release title is required");
    if (!["eco", "standard"].includes(pricingTier)) throw new Error("Invalid pricing tier");
    logStep("Request data received", { trackCount, releaseTitle, releaseId, pricingTier });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer found");
    }

    // Calculate fees based on tier
    const tierPricing = PRICING[pricingTier as keyof typeof PRICING];
    const trackTotal = tierPricing.trackFee * trackCount;
    const totalAmount = trackTotal + tierPricing.upcFee;
    const tierName = pricingTier === "eco" ? "Trackball Eco" : "Trackball Standard";

    logStep("Calculated fees", { 
      pricingTier,
      trackCount, 
      trackTotal: trackTotal / 100, 
      upcFee: tierPricing.upcFee / 100, 
      total: totalAmount / 100 
    });

    const origin = req.headers.get("origin") || "https://my.trackball.cc";

    // Create checkout session with line items
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `${tierName} - Track Fee (${trackCount} track${trackCount > 1 ? 's' : ''})`,
              description: `Distribution fee for "${releaseTitle}"`,
            },
            unit_amount: tierPricing.trackFee,
          },
          quantity: trackCount,
        },
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `${tierName} - UPC Fee`,
              description: "Universal Product Code for your release",
            },
            unit_amount: tierPricing.upcFee,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard?release_submitted=true&release_id=${releaseId || 'new'}`,
      cancel_url: `${origin}/dashboard?release_canceled=true`,
      metadata: {
        user_id: user.id,
        release_id: releaseId || '',
        track_count: trackCount.toString(),
        release_title: releaseTitle,
        pricing_tier: pricingTier,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-release-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
