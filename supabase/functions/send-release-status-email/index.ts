import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

interface ReleaseStatusEmailRequest {
  userEmail: string;
  releaseTitle: string;
  artistName: string;
  status: string;
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, releaseTitle, artistName, status, rejectionReason }: ReleaseStatusEmailRequest = await req.json();

    console.log("Sending release status email to:", userEmail);

    let statusEmoji = "";
    let statusColor = "";
    let statusMessage = "";
    
    switch (status) {
      case "approved":
        statusEmoji = "✅";
        statusColor = "#22c55e";
        statusMessage = "Your release has been approved and is being prepared for distribution!";
        break;
      case "rejected":
        statusEmoji = "❌";
        statusColor = "#ef4444";
        statusMessage = "Your release has been rejected. Please review the feedback and resubmit.";
        break;
      case "published":
        statusEmoji = "🎉";
        statusColor = "#3b82f6";
        statusMessage = "Your release is now live on streaming platforms!";
        break;
      default:
        statusEmoji = "⏳";
        statusColor = "#eab308";
        statusMessage = "Your release status has been updated.";
    }

    const htmlContent = `
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
            .release-info { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; margin-top: 15px; }
            .rejection-reason { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin-top: 20px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusEmoji} Release Status Update</h1>
            </div>
            <div class="content">
              <p>${statusMessage}</p>
              <div class="release-info">
                <h2 style="margin-top: 0;">${escapeHtml(releaseTitle)}</h2>
                <p style="color: #666; margin: 10px 0;">by ${escapeHtml(artistName)}</p>
                <div class="status-badge" style="background-color: ${statusColor}; color: white;">
                  ${statusEmoji} ${status.toUpperCase()}
                </div>
                ${rejectionReason ? `
                  <div class="rejection-reason">
                    <strong>Rejection Reason:</strong><br>
                    ${escapeHtml(rejectionReason)}
                  </div>
                ` : ''}
              </div>
              <p style="margin-top: 20px; text-align: center;">
                <a href="https://trackball.cc/dashboard" style="background: linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View in Dashboard
                </a>
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

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "My Trackball <releases@trackball.cc>",
        to: [userEmail],
        subject: `${statusEmoji} Release ${status}: ${escapeHtml(releaseTitle)}`,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await emailResponse.json();
    console.log("Release status email sent successfully:", responseData);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending release status email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
