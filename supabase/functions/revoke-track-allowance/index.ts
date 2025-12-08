import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REVOKE-TRACK-ALLOWANCE] ${step}${detailsStr}`);
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

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    // Check admin role
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

    const { userId, subscriptionId } = await req.json();
    if (!userId) throw new Error("userId is required");

    logStep("Revoking for user", { userId, subscriptionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // If subscriptionId provided, cancel it
    if (subscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscriptionId);
        logStep("Cancelled Stripe subscription", { subscriptionId });
      } catch (stripeError: any) {
        logStep("Stripe cancellation error (may already be cancelled)", { error: stripeError.message });
      }
    } else {
      // Find and cancel any track_allowance subscriptions for this user
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();

      if (profile?.email) {
        const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
        if (customers.data.length > 0) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customers.data[0].id,
            status: "active",
            limit: 10,
          });

          for (const sub of subscriptions.data) {
            if (sub.metadata?.type === "track_allowance") {
              await stripe.subscriptions.cancel(sub.id);
              logStep("Cancelled subscription", { subscriptionId: sub.id });
            }
          }
        }
      }
    }

    // Remove track_allowance_usage records for current month
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await supabaseClient
      .from("track_allowance_usage")
      .delete()
      .eq("user_id", userId)
      .eq("month_year", monthYear);

    logStep("Deleted usage record", { userId, monthYear });

    return new Response(JSON.stringify({ success: true }), {
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
