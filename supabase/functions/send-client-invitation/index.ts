import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

interface InvitationRequest {
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  labelName: string;
  invitationId?: string;
  invitationType?: string;
  permissions?: string[];
  existingUser?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviterName, inviterEmail, inviteeEmail, labelName, invitationId, invitationType = "client", permissions = [], appUrl, existingUser = false }: InvitationRequest & { appUrl?: string } = await req.json();

    // Build permissions list
    const permissionsHtml = permissions.length > 0 
      ? `
        <p>You now have access to:</p>
        <ul>
          ${permissions.map(p => `<li>${escapeHtml(p.charAt(0).toUpperCase() + p.slice(1))}</li>`).join('')}
        </ul>
      `
      : '';

    let emailHtml = '';
    let emailSubject = '';

    if (existingUser) {
      // Email for existing users who were automatically added
      emailSubject = `You've been added to ${labelName} on My Trackball`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              h1 { margin: 0; font-size: 24px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              ul { background: white; padding: 20px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎵 Added to Label</h1>
              </div>
              <div class="content">
                <p>Hi there,</p>
                <p><strong>${escapeHtml(inviterName)}</strong> (${escapeHtml(inviterEmail)}) has added you to <strong>${escapeHtml(labelName)}</strong> on My Trackball.</p>
                
                ${permissionsHtml}

                <p style="text-align: center;">
                  <a href="${appUrl || "http://localhost:5173"}/dashboard" class="cta-button">
                    Go to Dashboard
                  </a>
                </p>

                <p style="color: #666; font-size: 14px; margin-top: 40px;">
                  You can now access this label from your My Trackball account.
                </p>
              </div>
              <div class="footer">
                <p>© 2025 XZ1 Recording Ventures. All rights reserved.</p>
                <p>My Trackball Distribution Platform</p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      // Email for new invitations requiring acceptance
      const acceptUrl = `${appUrl || "http://localhost:5173"}/accept-invitation?token=${invitationId}`;
      emailSubject = `You've been invited to join My Trackball`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              h1 { margin: 0; font-size: 24px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              ul { background: white; padding: 20px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎵 My Trackball Invitation</h1>
              </div>
              <div class="content">
                <p>Hi there,</p>
                <p><strong>${escapeHtml(inviterName)}</strong> (${escapeHtml(inviterEmail)}) has invited you to join <strong>${escapeHtml(labelName)}</strong> on My Trackball.</p>
                
                ${permissionsHtml}

                <p style="text-align: center;">
                  <a href="${acceptUrl}" class="cta-button">
                    Accept Invitation
                  </a>
                </p>

                <p style="color: #666; font-size: 14px;">
                  This invitation will expire in 7 days. If you don't have a My Trackball account yet, you'll be able to create one when you accept the invitation.
                </p>

                <p style="color: #666; font-size: 14px; margin-top: 40px;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
              <div class="footer">
                <p>© 2025 XZ1 Recording Ventures. All rights reserved.</p>
                <p>My Trackball Distribution Platform</p>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "My Trackball <invitations@trackball.cc>",
        to: [inviteeEmail],
        subject: emailSubject,
        html: emailHtml,
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
