import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONSUME-TRACK-ALLOWANCE] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { trackCount, releaseId, releaseTitle } = await req.json();
    if (!trackCount || trackCount < 1) throw new Error("Invalid track count");
    logStep("Request data", { trackCount, releaseId, releaseTitle });

    // Get current month usage
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: usageData, error: usageError } = await supabaseClient
      .from("track_allowance_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch usage: ${usageError.message}`);
    }

    const currentUsage = usageData?.track_count || 0;
    const tracksAllowed = usageData?.tracks_allowed || 0;
    const tracksRemaining = tracksAllowed - currentUsage;

    logStep("Current usage", { currentUsage, tracksAllowed, tracksRemaining });

    if (tracksRemaining < trackCount) {
      throw new Error(`Insufficient track allowance. You have ${tracksRemaining} tracks remaining but need ${trackCount}.`);
    }

    // Update usage count
    const newUsage = currentUsage + trackCount;
    
    if (usageData) {
      const { error: updateError } = await supabaseClient
        .from("track_allowance_usage")
        .update({ 
          track_count: newUsage,
          updated_at: new Date().toISOString()
        })
        .eq("id", usageData.id);

      if (updateError) throw new Error(`Failed to update usage: ${updateError.message}`);
    } else {
      // Create new usage record if it doesn't exist
      const { error: insertError } = await supabaseClient
        .from("track_allowance_usage")
        .insert({
          user_id: user.id,
          month_year: monthYear,
          track_count: trackCount,
          tracks_allowed: 0 // Will be updated by check-track-allowance when subscription is checked
        });

      if (insertError) throw new Error(`Failed to create usage: ${insertError.message}`);
    }

    logStep("Usage updated", { newUsage, tracksRemaining: tracksAllowed - newUsage });

    // Log the consumption for audit
    if (releaseId) {
      await supabaseClient
        .from("distribution_logs")
        .insert({
          release_id: releaseId,
          status: 'track_allowance_consumed',
          notes: `Used ${trackCount} track slot(s) from monthly allowance for "${releaseTitle || 'release'}"`
        });
    }

    return new Response(JSON.stringify({ 
      success: true,
      tracksConsumed: trackCount,
      newTracksUsed: newUsage,
      tracksRemaining: tracksAllowed - newUsage
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
