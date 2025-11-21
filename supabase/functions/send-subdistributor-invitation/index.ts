import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  subdistributorId: string;
  subdistributorName: string;
  ownerEmail: string;
  primaryColor: string;
  backgroundColor: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      subdistributorId,
      subdistributorName,
      ownerEmail,
      primaryColor,
      backgroundColor,
    }: InvitationRequest = await req.json();

    console.log("Creating subdistributor invitation for:", ownerEmail);

    // Create invitation record
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { error: insertError } = await supabase
      .from("subdistributor_invitations")
      .insert({
        subdistributor_id: subdistributorId,
        invitee_email: ownerEmail,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        primary_color: primaryColor,
        background_color: backgroundColor,
      });

    if (insertError) {
      console.error("Failed to create invitation record:", insertError);
      throw insertError;
    }

    // Send invitation email
    // Get the origin from the request headers
    const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";
    const invitationUrl = `${origin}/accept-subdistributor-invitation?token=${invitationToken}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${primaryColor};">You've been invited!</h1>
        <p>You've been invited to manage <strong>${subdistributorName}</strong> on Trackball Distribution.</p>
        <p>As a subdistributor admin, you'll have access to a custom-branded admin portal to manage your own distribution platform.</p>
        <div style="margin: 30px 0;">
          <a href="${invitationUrl}" 
             style="background-color: ${primaryColor}; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This invitation will expire in 7 days.
        </p>
        <p style="color: #666; font-size: 14px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trackball Distribution <notifications@trackball.cc>",
        to: [ownerEmail],
        subject: `Invitation to manage ${subdistributorName}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Failed to send invitation email:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    console.log("Subdistributor invitation sent successfully to:", ownerEmail);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-subdistributor-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
