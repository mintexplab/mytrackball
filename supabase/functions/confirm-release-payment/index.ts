import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-RELEASE-PAYMENT] ${step}${detailsStr}`);
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
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { paymentIntentId, releaseId, usedTrackAllowance, trackCount: passedTrackCount } = await req.json();
    if (!paymentIntentId && !usedTrackAllowance) throw new Error("Payment intent ID is required");
    if (!releaseId) throw new Error("Release ID is required");
    logStep("Request data received", { paymentIntentId, releaseId, usedTrackAllowance, passedTrackCount });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get track count for the release
    const { data: tracks } = await supabaseClient
      .from('tracks')
      .select('id')
      .eq('release_id', releaseId);

    const trackCount = passedTrackCount || tracks?.length || 1;
    logStep("Track count determined", { trackCount });

    // If using track allowance, update usage
    if (usedTrackAllowance) {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      // Get or create usage record
      const { data: existingUsage } = await supabaseClient
        .from('track_allowance_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('month_year', currentMonth)
        .single();

      if (existingUsage) {
        const newTrackCount = existingUsage.track_count + trackCount;
        await supabaseClient
          .from('track_allowance_usage')
          .update({ 
            track_count: newTrackCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUsage.id);
        logStep("Updated track allowance usage", { newTrackCount });

        // Check if user is at 80% or above and send notification
        const usagePercentage = (newTrackCount / existingUsage.tracks_allowed) * 100;
        if (usagePercentage >= 80) {
          try {
            await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-track-allowance-notification`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                },
                body: JSON.stringify({
                  email: user.email,
                  userName: user.user_metadata?.full_name || user.email?.split('@')[0],
                  tracksUsed: newTrackCount,
                  tracksAllowed: existingUsage.tracks_allowed,
                  tracksRemaining: Math.max(0, existingUsage.tracks_allowed - newTrackCount),
                  usagePercentage,
                }),
              }
            );
            logStep("Sent track allowance notification");
          } catch (notifError) {
            logStep("Failed to send notification (non-blocking)", { error: notifError });
          }
        }
      } else {
        // Create new usage record (shouldn't happen normally but handle it)
        await supabaseClient
          .from('track_allowance_usage')
          .insert({
            user_id: user.id,
            month_year: currentMonth,
            track_count: trackCount,
            tracks_allowed: 0, // Will be updated by subscription webhook
          });
        logStep("Created new track allowance usage record");
      }
    }

    // If there was a payment (not using track allowance), verify it
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      logStep("PaymentIntent retrieved", { status: paymentIntent.status });

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
      }

      if (paymentIntent.metadata.release_id !== releaseId) {
        throw new Error("Payment intent does not match release");
      }
      if (paymentIntent.metadata.user_id !== user.id) {
        throw new Error("Payment intent does not belong to user");
      }
    }

    // Update release status to pending
    const { data: releaseData, error: updateError } = await supabaseClient
      .from('releases')
      .update({ status: 'pending' })
      .eq('id', releaseId)
      .eq('user_id', user.id)
      .select('title, artist_name')
      .single();

    if (updateError) {
      throw new Error(`Failed to update release: ${updateError.message}`);
    }

    logStep("Release updated to pending", { releaseId });

    // Send payment receipt email only if there was a payment
    if (paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const receiptResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-payment-receipt`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              email: user.email,
              userName: user.user_metadata?.full_name || user.email?.split('@')[0],
              releaseTitle: releaseData?.title || 'Your Release',
              artistName: releaseData?.artist_name || 'Artist',
              amount: paymentIntent.amount,
              trackCount: trackCount,
              paymentDate: new Date().toLocaleDateString('en-CA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
            }),
          }
        );
        logStep("Payment receipt email sent", { success: receiptResponse.ok });
      } catch (emailError) {
        logStep("Failed to send receipt email (non-blocking)", { error: emailError });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in confirm-release-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
