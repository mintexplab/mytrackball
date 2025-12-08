import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADD-EXTRA-TRACKS] ${step}${detailsStr}`);
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

    const { extraTracks, paymentMethodId } = await req.json();
    if (!extraTracks || extraTracks < 5) {
      throw new Error("Minimum 5 extra tracks required");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      throw new Error("No Stripe customer found. Please set up a payment method first.");
    }

    logStep("Found customer", { customerId });

    // Find existing track_allowance subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    let existingSubscription = null;
    let currentTracks = 0;

    for (const sub of subscriptions.data) {
      if (sub.metadata?.type === "track_allowance") {
        existingSubscription = sub;
        currentTracks = parseInt(sub.metadata?.tracks_allowed || "0", 10);
        break;
      }
    }

    if (!existingSubscription) {
      throw new Error("No active track allowance subscription found");
    }

    const newTotalTracks = currentTracks + extraTracks;
    
    // Calculate new price based on tier
    const pricePerTrack = newTotalTracks > 45 ? 200 : 400; // $2 or $4 in cents
    const newMonthlyAmount = newTotalTracks * pricePerTrack;

    logStep("Calculating new subscription", { 
      currentTracks, 
      extraTracks, 
      newTotalTracks,
      pricePerTrack,
      newMonthlyAmount 
    });

    // Check if this is an admin-granted subscription (free)
    const isAdminGranted = existingSubscription.metadata?.admin_granted === "true";

    if (isAdminGranted) {
      // For admin-granted subscriptions, update the tracks_allowed in metadata only
      await stripe.subscriptions.update(existingSubscription.id, {
        metadata: {
          ...existingSubscription.metadata,
          tracks_allowed: String(newTotalTracks),
        },
      });

      // Update the database
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      await supabaseClient
        .from("track_allowance_usage")
        .upsert({
          user_id: user.id,
          month_year: monthYear,
          subscription_id: existingSubscription.id,
          tracks_allowed: newTotalTracks,
        }, {
          onConflict: "user_id,month_year"
        });

      logStep("Updated admin-granted subscription", { newTotalTracks });

      return new Response(JSON.stringify({ 
        success: true,
        newTotalTracks,
        message: "Extra tracks added to your allowance!"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // For paid subscriptions, need to create a checkout for the upgrade
    if (!paymentMethodId) {
      throw new Error("Payment method required for paid subscription upgrade");
    }

    // Create a new price for the updated track count
    const newPrice = await stripe.prices.create({
      unit_amount: newMonthlyAmount,
      currency: "cad",
      recurring: { interval: "month" },
      product_data: {
        name: `Track Allowance - ${newTotalTracks} tracks/month`,
        metadata: {
          type: "track_allowance",
          tracks_allowed: String(newTotalTracks),
        },
      },
    });

    logStep("Created new price", { priceId: newPrice.id, amount: newMonthlyAmount });

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(existingSubscription.id, {
      items: [
        {
          id: existingSubscription.items.data[0].id,
          price: newPrice.id,
        },
      ],
      metadata: {
        ...existingSubscription.metadata,
        tracks_allowed: String(newTotalTracks),
      },
      proration_behavior: "create_prorations",
    });

    logStep("Updated subscription", { subscriptionId: updatedSubscription.id });

    // Update the database
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await supabaseClient
      .from("track_allowance_usage")
      .upsert({
        user_id: user.id,
        month_year: monthYear,
        subscription_id: updatedSubscription.id,
        tracks_allowed: newTotalTracks,
      }, {
        onConflict: "user_id,month_year"
      });

    return new Response(JSON.stringify({ 
      success: true,
      newTotalTracks,
      newMonthlyAmount: newMonthlyAmount / 100,
      message: `Subscription upgraded to ${newTotalTracks} tracks/month!`
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
