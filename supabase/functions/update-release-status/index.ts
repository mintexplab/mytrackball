import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-RELEASE-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check admin role
    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Only admins can update release status");
    }
    logStep("Admin verified");

    const { releaseId, status, paymentStatus } = await req.json();
    if (!releaseId) throw new Error("Release ID is required");
    
    logStep("Request data", { releaseId, status, paymentStatus });

    // Get release details for email notification
    const { data: release, error: fetchError } = await supabaseClient
      .from("releases")
      .select(`
        *,
        profiles!releases_user_id_fkey(email)
      `)
      .eq("id", releaseId)
      .single();

    if (fetchError) throw new Error(`Failed to fetch release: ${fetchError.message}`);
    if (!release) throw new Error("Release not found");

    // Build update object
    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.payment_status = paymentStatus;

    // Update release using service role (bypasses RLS)
    const { error: updateError } = await supabaseClient
      .from("releases")
      .update(updateData)
      .eq("id", releaseId);

    if (updateError) throw new Error(`Failed to update release: ${updateError.message}`);
    logStep("Release updated", updateData);

    // Send email notification if status changed
    if (status && release.profiles?.email) {
      try {
        await supabaseClient.functions.invoke("send-release-status-email", {
          body: {
            userEmail: release.profiles.email,
            releaseTitle: release.title,
            artistName: release.artist_name,
            status: status,
            rejectionReason: release.rejection_reason,
          },
        });
        logStep("Email notification sent");
      } catch (emailError) {
        logStep("Email notification failed", { error: emailError });
        // Don't fail the whole operation for email failure
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Release status updated to ${status || paymentStatus}`
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
