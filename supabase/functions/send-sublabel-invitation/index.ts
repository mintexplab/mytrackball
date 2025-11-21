import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  labelName: string;
  invitationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviterName, inviterEmail, inviteeEmail, labelName, invitationId }: InvitationRequest = await req.json();

    const acceptUrl = `${Deno.env.get("VITE_SUPABASE_URL")}/auth/v1/verify?token=${invitationId}&type=invite`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "My Trackball <onboarding@resend.dev>",
        to: [inviteeEmail],
        subject: `You've been invited to join ${labelName} on My Trackball`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">My Trackball Sublabel Invitation</h1>
            <p>Hi there,</p>
            <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join their label <strong>${labelName}</strong> as a sublabel account on My Trackball.</p>
            
            <p>As a sublabel, you'll be able to:</p>
            <ul>
              <li>Submit releases under the master label</li>
              <li>Access label resources and branding</li>
              <li>Collaborate with the label team</li>
            </ul>

            <p style="margin: 30px 0;">
              <a href="${acceptUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Accept Invitation
              </a>
            </p>

            <p style="color: #666; font-size: 14px;">
              This invitation will expire in 7 days. If you don't have a My Trackball account yet, you'll be able to create one when you accept the invitation.
            </p>

            <p style="color: #666; font-size: 14px; margin-top: 40px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">
              © 2025 XZ1 Recording Ventures. All rights reserved.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await emailResponse.json();
    console.log("Invitation email sent successfully:", responseData);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
