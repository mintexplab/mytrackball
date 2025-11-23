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

interface TicketReplyRequest {
  ticketId: string;
  userEmail: string;
  userName: string;
  subject: string;
  replyMessage: string;
  ticketStatus: string;
  escalationEmail: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, userEmail, userName, subject, replyMessage, ticketStatus, escalationEmail }: TicketReplyRequest = await req.json();

    console.log("Sending ticket reply email:", { ticketId, userEmail, ticketStatus });

    const statusEmoji: Record<string, string> = {
      open: "🔓",
      in_progress: "⏳",
      resolved: "✅",
      escalated: "⚠️"
    };

    const statusText = ticketStatus.replace("_", " ").toUpperCase();

    // Email to user with reply
    const userEmailHtml = `
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
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; font-weight: bold; margin: 15px 0; }
            .status-open { background: #3b82f6; color: white; }
            .status-in_progress { background: #f59e0b; color: white; }
            .status-resolved { background: #10b981; color: white; }
            .status-escalated { background: #dc2626; color: white; }
            .reply-box { background: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0; border-radius: 4px; }
            .reply-label { font-size: 12px; color: #666; font-weight: bold; margin-bottom: 10px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .warning-box { background: #fef2f2; border: 1px solid #fee2e2; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Support Ticket Update</h1>
            </div>
            <div class="content">
              <p>Hi ${escapeHtml(userName)},</p>
              <p>We've received an update on your support ticket:</p>
              
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>Subject:</strong> ${escapeHtml(subject)}<br>
                <strong>Ticket ID:</strong> ${escapeHtml(ticketId.substring(0, 8))}<br>
                <strong>Status:</strong> <span class="status-badge status-${ticketStatus}">${statusEmoji[ticketStatus]} ${statusText}</span>
              </div>

              <div class="reply-box">
                <div class="reply-label">SUPPORT TEAM REPLY:</div>
                <p style="white-space: pre-wrap; margin: 0;">${escapeHtml(replyMessage)}</p>
              </div>

              ${escalationEmail ? `
                <div class="warning-box">
                  <strong>⚠️ Escalated:</strong> Your ticket has been escalated to ${escapeHtml(escalationEmail)} for specialized support.
                </div>
              ` : ''}

              <p style="text-align: center; margin-top: 30px;">
                <a href="https://mytrackball.cc/dashboard" class="cta-button">
                  View Ticket in Dashboard
                </a>
              </p>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                <strong>Reply to this email to add a message to your ticket.</strong> Your response will be automatically added to the ticket conversation.
              </p>

              <p style="color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px;">
                Ticket Reference: ${escapeHtml(ticketId)}<br>
                This is an automated message from My Trackball Support System.
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

    // Send email to user
    const userEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "My Trackball Support <support@trackball.cc>",
        to: [userEmail],
        reply_to: "support@trackball.cc",
        subject: `[Ticket #${ticketId.substring(0, 8)}] ${subject}`,
        html: userEmailHtml,
        headers: {
          "X-Ticket-ID": ticketId
        }
      }),
    });

    if (!userEmailResponse.ok) {
      const errorData = await userEmailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const userResponseData = await userEmailResponse.json();
    console.log("User notification email sent:", userResponseData);

    // If escalated, send copy to escalation email
    if (escalationEmail && ticketStatus === "escalated") {
      const escalationEmailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #dc2626; color: white; padding: 20px; border-radius: 6px 6px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 6px 6px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>🚨 Escalated Support Ticket</h2>
              </div>
              <div class="content">
                <p>A support ticket has been escalated to you:</p>
                <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
                  <strong>From:</strong> ${escapeHtml(userName)} (${escapeHtml(userEmail)})<br>
                  <strong>Subject:</strong> ${escapeHtml(subject)}<br>
                  <strong>Ticket ID:</strong> ${escapeHtml(ticketId)}<br>
                </div>
                <div style="background: white; padding: 15px; border-radius: 4px; border-left: 3px solid #dc2626;">
                  <strong>Latest Reply:</strong><br>
                  <p style="white-space: pre-wrap;">${escapeHtml(replyMessage)}</p>
                </div>
                <p style="margin-top: 20px;">Please review and respond to this ticket as soon as possible.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const escalationEmailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "My Trackball Support <support@trackball.cc>",
          to: [escalationEmail],
          subject: `[ESCALATED] Ticket #${ticketId.substring(0, 8)} - ${subject}`,
          html: escalationEmailHtml,
        }),
      });

      if (!escalationEmailResponse.ok) {
        console.error("Failed to send escalation email");
      } else {
        console.log("Escalation email sent to:", escalationEmail);
      }
    }

    return new Response(JSON.stringify({ success: true, messageId: userResponseData.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-ticket-reply:", error);
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
