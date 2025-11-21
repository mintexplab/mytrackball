import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
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
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ subscribed: false, product_id: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Update profile with customer ID if not already set
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
    
    if (updateError) {
      logStep("Error updating profile with customer ID", { error: updateError });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let subscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId, endDate: subscriptionEnd });
      
      productId = subscription.items.data[0].price.product as string;
      logStep("Determined subscription product", { productId });

      // Update profile with subscription ID
      const { error: subUpdateError } = await supabaseClient
        .from('profiles')
        .update({ stripe_subscription_id: subscriptionId })
        .eq('id', user.id);
      
      if (subUpdateError) {
        logStep("Error updating profile with subscription ID", { error: subUpdateError });
      }

      // Get the plan name from product ID
      const { data: plan } = await supabaseClient
        .from('plans')
        .select('name, id')
        .eq('stripe_product_id', productId)
        .single();

      if (plan) {
        logStep("Plan found for product", { planName: plan.name, planId: plan.id });
        
        // Update or create user_plans entry
        const { data: existingPlan } = await supabaseClient
          .from('user_plans')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingPlan) {
          // Update existing plan
          await supabaseClient
            .from('user_plans')
            .update({
              plan_id: plan.id,
              plan_name: plan.name,
              status: 'active',
              expires_at: subscriptionEnd
            })
            .eq('user_id', user.id);
          logStep("Updated existing user plan");
        } else {
          // Create new plan
          await supabaseClient
            .from('user_plans')
            .insert({
              user_id: user.id,
              plan_id: plan.id,
              plan_name: plan.name,
              status: 'active',
              expires_at: subscriptionEnd
            });
          logStep("Created new user plan");
        }
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});