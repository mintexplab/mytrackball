import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  invitationId: string;
  planType: 'artist_plan' | 'label_designation';
  planName: string;
  planFeatures: string[];
  royaltySplit?: number | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, invitationId, planType, planName, planFeatures, royaltySplit }: InvitationRequest = await req.json();

    if (!email || !invitationId || !planType || !planName || !planFeatures) {
      throw new Error("Missing required fields");
    }

    const signupUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://trackball.lovable.app'}/accept-artist-invitation?token=${invitationId}`;

    const isLabelPartner = planType === 'label_designation' && planName === 'Label Partner';
    
    let introText = '';
    if (isLabelPartner && royaltySplit !== null && royaltySplit !== undefined) {
      introText = `As per your contract, you will be invited as a <strong>Label Partner</strong> with a <strong>${royaltySplit}/${100 - royaltySplit}</strong> royalty split.<br><br>This grants you:`;
    } else if (planType === 'label_designation') {
      introText = `As per your contract, you will be invited as a <strong>${planName}</strong>.<br><br>This grants you:`;
    } else {
      introText = `Trackball Distribution has invited you to create an account on My Trackball. You have been assigned <strong>${planName}</strong> based on the plan you have purchased.<br><br>Your included services are:`;
    }

    const featuresList = planFeatures.map(feature => `<li>${feature}</li>`).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Rubik', Arial, sans-serif;
              background-color: #000000;
              color: #ffffff;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #ef4444;
              font-size: 32px;
              margin: 0;
            }
            .content {
              background-color: #1a1a1a;
              border: 1px solid #ef4444;
              border-radius: 8px;
              padding: 30px;
              margin-bottom: 20px;
            }
            .content p {
              line-height: 1.6;
              margin: 15px 0;
            }
            .content ul {
              margin: 15px 0;
              padding-left: 20px;
            }
            .content li {
              margin: 8px 0;
            }
            .button {
              display: inline-block;
              background-color: #ef4444;
              color: #ffffff;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #dc2626;
            }
            .login-link {
              color: #ef4444;
              text-decoration: none;
            }
            .login-link:hover {
              text-decoration: underline;
            }
            .footer {
              text-align: center;
              color: #999999;
              font-size: 14px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>My Trackball</h1>
            </div>
            <div class="content">
              <p>${introText}</p>
              <ul>
                ${featuresList}
              </ul>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${signupUrl}" class="button">Create Your Account</a>
              </div>
              <p style="text-align: center; margin-top: 20px; font-size: 14px;">
                Already have an account? <a href="${signupUrl}" class="login-link">Log in here</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 XZ1 Recording Ventures. All rights reserved.</p>
              <p>Need help? Contact us at <a href="mailto:contact@trackball.cc" style="color: #ef4444;">contact@trackball.cc</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trackball Distribution <noreply@trackball.cc>",
        to: [email],
        subject: "You've been invited to My Trackball",
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    console.log("Artist invitation email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-artist-invitation function:", error);
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