import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "distribution@xz1recordings.ca";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationPayload {
  type: "new_ticket" | "release_submitted" | "release_paid" | "takedown_requested" | "info_response";
  title: string;
  message: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  releaseTitle?: string;
  ticketSubject?: string;
  additionalInfo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: AdminNotificationPayload = await req.json();
    const { type, title, message, userId, userEmail, userName, releaseTitle, ticketSubject, additionalInfo } = payload;

    console.log("Sending admin notification:", type);

    // Email subject based on type
    const subjectMap: Record<string, string> = {
      new_ticket: `🎫 New Support Ticket: ${ticketSubject || 'No Subject'}`,
      release_submitted: `📀 New Release Submitted: ${releaseTitle || 'Unknown'}`,
      release_paid: `💰 Release Payment Received: ${releaseTitle || 'Unknown'}`,
      takedown_requested: `⚠️ Takedown Requested: ${releaseTitle || 'Unknown'}`,
      info_response: `📩 Info Response Received: ${releaseTitle || 'Unknown'}`,
    };

    const emailSubject = subjectMap[type] || `Trackball Admin Alert: ${title}`;

    // Build email content
    let emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1f2937, #374151); padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: #ef4444; margin: 0; font-size: 20px; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: 600; color: #374151; min-width: 120px; }
          .value { color: #1f2937; }
          .message-box { background: #fff; border: 1px solid #e5e7eb; padding: 15px; border-radius: 4px; margin-top: 15px; }
          .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
          .badge-ticket { background: #dbeafe; color: #1e40af; }
          .badge-release { background: #dcfce7; color: #166534; }
          .badge-payment { background: #fef3c7; color: #92400e; }
          .badge-takedown { background: #fee2e2; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Admin Notification</h1>
          </div>
          <div class="content">
            <span class="badge badge-${type === 'new_ticket' ? 'ticket' : type === 'release_paid' ? 'payment' : type === 'takedown_requested' ? 'takedown' : 'release'}">${type.replace('_', ' ').toUpperCase()}</span>
            
            <h2 style="margin-top: 20px;">${title}</h2>
            
            <div style="margin-top: 20px;">
    `;

    if (userName || userEmail) {
      emailContent += `
              <div class="info-row">
                <span class="label">User:</span>
                <span class="value">${userName || 'N/A'} (${userEmail || 'N/A'})</span>
              </div>
      `;
    }

    if (releaseTitle) {
      emailContent += `
              <div class="info-row">
                <span class="label">Release:</span>
                <span class="value">${releaseTitle}</span>
              </div>
      `;
    }

    if (ticketSubject) {
      emailContent += `
              <div class="info-row">
                <span class="label">Subject:</span>
                <span class="value">${ticketSubject}</span>
              </div>
      `;
    }

    emailContent += `
            </div>
            
            <div class="message-box">
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            
            ${additionalInfo ? `<p style="margin-top: 15px; color: #6b7280; font-size: 14px;">${additionalInfo}</p>` : ''}
            
            <p style="margin-top: 20px;">
              <a href="https://my.trackball.cc/dashboard" style="display: inline-block; background: #ef4444; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Open Admin Portal</a>
            </p>
          </div>
          <div class="footer">
            <p>Trackball Admin Notifications</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Trackball Admin <contact@trackball.cc>",
      to: [ADMIN_EMAIL],
      subject: emailSubject,
      html: emailContent,
    });

    console.log("Admin notification email sent:", emailResponse);

    // Also create a dashboard notification for all admins
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all admin user IDs
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles && adminRoles.length > 0) {
      const notifications = adminRoles.map(role => ({
        user_id: role.user_id,
        title: title,
        message: message,
        type: `admin_${type}`
      }));

      await supabase.from("notifications").insert(notifications);
      console.log("Dashboard notifications created for", adminRoles.length, "admins");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending admin notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
