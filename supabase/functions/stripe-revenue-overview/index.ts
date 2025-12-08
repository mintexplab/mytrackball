import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-REVENUE-OVERVIEW] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    logStep("Admin verified", { adminId: userData.user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get date 30 days ago
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

    // Fetch all successful charges in the last 30 days
    const charges = await stripe.charges.list({
      limit: 100,
      created: { gte: thirtyDaysAgo },
    });

    logStep("Fetched charges", { count: charges.data.length });

    let releaseRevenue = 0;
    let upcRevenue = 0;
    let takedownRevenue = 0;
    let subscriptionRevenue = 0;
    const recentPayments: any[] = [];
    
    // Daily revenue tracking for charts
    const dailyRevenue: Record<string, { date: string; revenue: number; releases: number; takedowns: number; subscriptions: number }> = {};
    
    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyRevenue[dateStr] = { date: dateStr, revenue: 0, releases: 0, takedowns: 0, subscriptions: 0 };
    }

    for (const charge of charges.data) {
      if (charge.status !== "succeeded" || charge.refunded) continue;

      const amount = charge.amount;
      const metadata = charge.metadata || {};
      const description = charge.description || "";
      const chargeDate = new Date(charge.created * 1000).toISOString().split('T')[0];

      let type = "other";

      // Categorize by metadata or description
      if (metadata.type === "track_allowance" || description.toLowerCase().includes("track allowance")) {
        subscriptionRevenue += amount;
        type = "subscription";
        if (dailyRevenue[chargeDate]) {
          dailyRevenue[chargeDate].subscriptions += amount;
          dailyRevenue[chargeDate].revenue += amount;
        }
      } else if (metadata.type === "takedown" || description.toLowerCase().includes("takedown")) {
        takedownRevenue += amount;
        type = "takedown";
        if (dailyRevenue[chargeDate]) {
          dailyRevenue[chargeDate].takedowns += amount;
          dailyRevenue[chargeDate].revenue += amount;
        }
      } else if (metadata.type === "release" || description.toLowerCase().includes("release")) {
        // Estimate UPC vs track fees - $8 UPC per release
        const upcFee = 800; // $8 in cents
        upcRevenue += upcFee;
        releaseRevenue += (amount - upcFee);
        type = "release";
        if (dailyRevenue[chargeDate]) {
          dailyRevenue[chargeDate].releases += amount;
          dailyRevenue[chargeDate].revenue += amount;
        }
      } else {
        // Default to release revenue for untagged charges
        releaseRevenue += amount;
        type = "release";
        if (dailyRevenue[chargeDate]) {
          dailyRevenue[chargeDate].releases += amount;
          dailyRevenue[chargeDate].revenue += amount;
        }
      }

      recentPayments.push({
        id: charge.id,
        amount: amount,
        description: description || `Payment - ${charge.billing_details?.email || "Unknown"}`,
        date: new Date(charge.created * 1000).toISOString(),
        type,
      });
    }

    // Also check subscriptions for recurring revenue
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });

    for (const sub of subscriptions.data) {
      if (sub.metadata?.type === "track_allowance" && sub.metadata?.admin_granted !== "true") {
        // Only count paid subscriptions, not admin-granted free ones
        const item = sub.items.data[0];
        if (item?.price?.unit_amount && item.price.unit_amount > 0) {
          subscriptionRevenue += item.price.unit_amount;
        }
      }
    }

    const totalRevenue = releaseRevenue + upcRevenue + takedownRevenue + subscriptionRevenue;

    logStep("Revenue calculated", { 
      totalRevenue, 
      releaseRevenue, 
      upcRevenue, 
      takedownRevenue, 
      subscriptionRevenue 
    });

    // Sort recent payments by date, limit to 20
    recentPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limitedPayments = recentPayments.slice(0, 20);
    
    // Convert daily revenue to sorted array
    const chartData = Object.values(dailyRevenue)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return new Response(JSON.stringify({
      totalRevenue,
      releaseRevenue,
      upcRevenue,
      takedownRevenue,
      subscriptionRevenue,
      recentPayments: limitedPayments,
      chartData,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
