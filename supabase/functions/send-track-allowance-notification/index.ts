import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRACK-ALLOWANCE-NOTIFICATION] ${step}${detailsStr}`);
};

interface NotificationRequest {
  email: string;
  userName: string;
  tracksUsed: number;
  tracksAllowed: number;
  tracksRemaining: number;
  usagePercentage: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email, userName, tracksUsed, tracksAllowed, tracksRemaining, usagePercentage }: NotificationRequest = await req.json();

    logStep("Request received", { email, usagePercentage });

    const isWarning = usagePercentage >= 80 && usagePercentage < 100;
    const isExceeded = usagePercentage >= 100;

    const subject = isExceeded 
      ? "Track Allowance Exceeded - My Trackball"
      : "Track Allowance Warning - My Trackball";

    const emailResponse = await resend.emails.send({
      from: "My Trackball <notifications@trackball.cc>",
      to: [email],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; padding: 32px; }
            .header { text-align: center; margin-bottom: 24px; }
            .logo { font-size: 24px; font-weight: bold; color: #ef4444; }
            .title { font-size: 20px; font-weight: bold; margin-bottom: 16px; }
            .warning { color: #f59e0b; }
            .exceeded { color: #ef4444; }
            .content { color: #a3a3a3; line-height: 1.6; }
            .stats { background-color: #262626; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .stat-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .stat-label { color: #a3a3a3; }
            .stat-value { font-weight: bold; color: #ffffff; }
            .progress-bar { background-color: #404040; height: 8px; border-radius: 4px; overflow: hidden; margin-top: 16px; }
            .progress-fill { height: 100%; background-color: ${isExceeded ? '#ef4444' : '#f59e0b'}; width: ${Math.min(usagePercentage, 100)}%; }
            .footer { text-align: center; margin-top: 24px; color: #666; font-size: 12px; }
            .button { display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">My Trackball</div>
            </div>
            
            <h1 class="title ${isExceeded ? 'exceeded' : 'warning'}">
              ${isExceeded ? '⚠️ Track Allowance Exceeded' : '⚡ Track Allowance Warning'}
            </h1>
            
            <div class="content">
              <p>Hi ${userName},</p>
              
              ${isExceeded ? `
                <p>You've used all your track allowance for this month. To continue submitting releases, you can either:</p>
                <ul>
                  <li>Pay the upfront fee ($5 CAD per track + $8 UPC) for additional releases</li>
                  <li>Wait until next month when your allowance resets</li>
                </ul>
              ` : `
                <p>You've used ${usagePercentage.toFixed(0)}% of your monthly track allowance. Consider your submission pace or upgrading your plan.</p>
              `}
            </div>
            
            <div class="stats">
              <div class="stat-row">
                <span class="stat-label">Tracks Used</span>
                <span class="stat-value">${tracksUsed}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Tracks Allowed</span>
                <span class="stat-value">${tracksAllowed}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Tracks Remaining</span>
                <span class="stat-value ${isExceeded ? 'exceeded' : ''}">${tracksRemaining}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.vercel.app') || 'https://my.trackball.cc'}/dashboard" class="button">
                View Dashboard
              </a>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Trackball Distribution. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    logStep("Email sent successfully", { emailResponse });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
