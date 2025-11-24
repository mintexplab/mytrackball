import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: InvitationRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const signupUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://trackball.lovable.app'}/auth`;

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
              <p><strong>Trackball Distribution has invited you to join My Trackball</strong></p>
              <p>You've been invited to create an account on My Trackball, the music distribution platform that puts artists first.</p>
              <p>Click the button below to get started:</p>
              <div style="text-align: center;">
                <a href="${signupUrl}" class="button">Create Your Account</a>
              </div>
              <p>Once you create your account, you'll be able to:</p>
              <ul>
                <li>Submit your music for distribution</li>
                <li>Track your releases and royalties</li>
                <li>Manage your artist profile</li>
                <li>Access support and resources</li>
              </ul>
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
