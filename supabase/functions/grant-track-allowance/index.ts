import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GRANT-TRACK-ALLOWANCE] ${step}${detailsStr}`);
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

    const { userId, tracksPerMonth } = await req.json();
    if (!userId || !tracksPerMonth) {
      throw new Error("Missing required fields: userId and tracksPerMonth");
    }

    logStep("Request data", { userId, tracksPerMonth });

    // Get user email
    const { data: userProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profileError || !userProfile?.email) {
      throw new Error("User not found");
    }

    logStep("User found", { email: userProfile.email });

    // Calculate pricing - $4/track for 5-45, $2/track for 46+
    const pricePerTrack = tracksPerMonth > 45 ? 2 : 4;
    const monthlyAmount = tracksPerMonth * pricePerTrack;

    logStep("Pricing calculated", { pricePerTrack, monthlyAmount });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: userProfile.email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      const customer = await stripe.customers.create({ email: userProfile.email });
      customerId = customer.id;
      logStep("Created new customer", { customerId });
    }

    // Check for existing track allowance subscription
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
    });

    const existingTrackAllowance = existingSubscriptions.data.find(
      (sub: any) => sub.metadata?.type === "track_allowance"
    );

    if (existingTrackAllowance) {
      // Cancel existing subscription first
      await stripe.subscriptions.cancel(existingTrackAllowance.id);
      logStep("Cancelled existing subscription", { subscriptionId: existingTrackAllowance.id });
    }

    // Create or find product
    const products = await stripe.products.list({ limit: 100 });
    let product = products.data.find((p: any) => p.metadata?.type === "track_allowance" && p.metadata?.tracks === String(tracksPerMonth));

    if (!product) {
      product = await stripe.products.create({
        name: `Track Allowance - ${tracksPerMonth} tracks/month (Admin Granted)`,
        description: `Monthly subscription for ${tracksPerMonth} track submissions at $${pricePerTrack} CAD per track`,
        metadata: {
          type: "track_allowance",
          tracks: String(tracksPerMonth),
          admin_granted: "true",
        },
      });
      logStep("Created product", { productId: product.id });
    }

    // Create price - $0 for admin-granted subscriptions
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 0, // Free for admin-granted
      currency: "cad",
      recurring: { interval: "month" },
      metadata: {
        type: "track_allowance",
        tracks_allowed: String(tracksPerMonth),
        admin_granted: "true",
      },
    });
    logStep("Created price", { priceId: price.id });

    // Create subscription (no trial needed since price is $0)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      metadata: {
        type: "track_allowance",
        tracks_allowed: String(tracksPerMonth),
        admin_granted: "true",
        granted_by: userData.user.id,
      },
    });
    logStep("Created subscription", { subscriptionId: subscription.id });

    // Update track_allowance_usage table
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { error: upsertError } = await supabaseClient
      .from("track_allowance_usage")
      .upsert({
        user_id: userId,
        month_year: monthYear,
        subscription_id: subscription.id,
        tracks_allowed: tracksPerMonth,
        track_count: 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,month_year",
      });

    if (upsertError) {
      logStep("Upsert error", { error: upsertError });
    }

    logStep("Successfully granted track allowance");

    return new Response(JSON.stringify({
      success: true,
      subscriptionId: subscription.id,
      tracksAllowed: tracksPerMonth,
      monthlyAmount,
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
