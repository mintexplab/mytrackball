import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InfoRequestPayload {
  releaseId: string;
  releaseTitle: string;
  artistName: string;
  userEmail: string;
  userName: string;
  requiredInfo: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { releaseId, releaseTitle, artistName, userEmail, userName, requiredInfo }: InfoRequestPayload = await req.json();

    console.log("Sending info request email to:", userEmail);

    const emailResponse = await resend.emails.send({
      from: "Trackball Distribution <contact@trackball.cc>",
      to: [userEmail],
      subject: `Action Required: More information needed for "${releaseTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .info-box { background: #fff; border: 1px solid #fbbf24; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
            .info-box h3 { margin-top: 0; color: #92400e; }
            .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
            .release-info { background: #fff; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Information Required</h1>
            </div>
            <div class="content">
              <p>Hey ${userName || 'there'}!</p>
              
              <p>We need some additional information for your release before we can proceed with distribution.</p>
              
              <div class="release-info">
                <strong>Release:</strong> ${releaseTitle}<br>
                <strong>Artist:</strong> ${artistName}
              </div>
              
              <div class="info-box">
                <h3>⚠️ What we need from you:</h3>
                <p style="white-space: pre-wrap;">${requiredInfo}</p>
              </div>
              
              <p>Please log into your My Trackball dashboard to provide the required information or reply to this email with the details.</p>
              
              <p>Thank you for your cooperation!</p>
              
              <p>Best regards,<br>The Trackball Team</p>
            </div>
            <div class="footer">
              <p>© 2025 XZ1 Recording Ventures. All rights reserved.</p>
              <p>This email was sent regarding your release submission on Trackball Distribution.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Info request email sent successfully:", emailResponse);

    // Create a notification for the user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (profile) {
      await supabase.from("notifications").insert({
        user_id: profile.id,
        title: "Information Required",
        message: `Additional information is needed for your release "${releaseTitle}". Please check your email for details.`,
        type: "info_request"
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending info request email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
