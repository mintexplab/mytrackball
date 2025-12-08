import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-TRACK-ALLOWANCE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        hasSubscription: false,
        tracksAllowed: 0,
        tracksUsed: 0,
        tracksRemaining: 0,
        monthlyAmount: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // Find track allowance subscription
    let trackAllowanceSubscription = null;
    let tracksAllowed = 0;
    let monthlyAmount = 0;

    for (const sub of subscriptions.data) {
      if (sub.metadata?.type === "track_allowance") {
        trackAllowanceSubscription = sub;
        // Check both metadata keys for compatibility
        tracksAllowed = parseInt(sub.metadata?.tracks_allowed || sub.metadata?.tracks_per_month || "0", 10);
        // Calculate monthly amount from subscription items
        const item = sub.items.data[0];
        if (item?.price?.unit_amount !== undefined) {
          monthlyAmount = item.price.unit_amount / 100;
        }
        break;
      }
    }

    if (!trackAllowanceSubscription) {
      logStep("No track allowance subscription found");
      return new Response(JSON.stringify({ 
        hasSubscription: false,
        tracksAllowed: 0,
        tracksUsed: 0,
        tracksRemaining: 0,
        monthlyAmount: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found track allowance subscription", { 
      subscriptionId: trackAllowanceSubscription.id, 
      tracksAllowed,
      monthlyAmount
    });

    // Get current month usage
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: usageData } = await supabaseClient
      .from("track_allowance_usage")
      .select("track_count")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .single();

    const tracksUsed = usageData?.track_count || 0;
    const tracksRemaining = Math.max(0, tracksAllowed - tracksUsed);

    logStep("Usage calculated", { tracksUsed, tracksRemaining });

    // Update or create usage record with subscription info
    await supabaseClient
      .from("track_allowance_usage")
      .upsert({
        user_id: user.id,
        month_year: monthYear,
        subscription_id: trackAllowanceSubscription.id,
        tracks_allowed: tracksAllowed,
        track_count: tracksUsed
      }, {
        onConflict: "user_id,month_year"
      });

    // Safely get current period end
    let currentPeriodEnd = null;
    if (trackAllowanceSubscription.current_period_end && 
        typeof trackAllowanceSubscription.current_period_end === 'number') {
      currentPeriodEnd = new Date(trackAllowanceSubscription.current_period_end * 1000).toISOString();
    }

    return new Response(JSON.stringify({ 
      hasSubscription: true,
      subscriptionId: trackAllowanceSubscription.id,
      tracksAllowed,
      tracksUsed,
      tracksRemaining,
      monthlyAmount,
      currentPeriodEnd
    }), {
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
