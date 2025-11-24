import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, inviterName }: InvitationRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    // Create Supabase client with user's auth
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) throw new Error('Unauthorized');

    // Fetch subdistributor branding
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('subdistributor_dashboard_name, subdistributor_footer_text, subdistributor_logo_url, subdistributor_accent_color, is_subdistributor_master, label_name')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Use subdistributor branding if available, otherwise default branding
    const dashboardName = profile?.is_subdistributor_master 
      ? (profile.subdistributor_dashboard_name || 'My Trackball')
      : 'My Trackball';
    
    const footerText = profile?.is_subdistributor_master
      ? (profile.subdistributor_footer_text || '© 2025 XZ1 Recording Ventures. All rights reserved.')
      : '© 2025 XZ1 Recording Ventures. All rights reserved.';
    
    const logoUrl = profile?.is_subdistributor_master 
      ? profile.subdistributor_logo_url 
      : null;
    
    const accentColor = profile?.is_subdistributor_master
      ? (profile.subdistributor_accent_color || '#ef4444')
      : '#ef4444';

    const distributorName = profile?.label_name || inviterName || 'Trackball Distribution';

    const signupUrl = `${SUPABASE_URL?.replace('.supabase.co', '.lovable.app') || 'https://trackball.lovable.app'}/auth`;

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
              color: ${accentColor};
              font-size: 32px;
              margin: 0;
            }
            .logo {
              max-width: 150px;
              max-height: 80px;
              margin: 0 auto 20px;
              display: block;
            }
            .content {
              background-color: #1a1a1a;
              border: 1px solid ${accentColor};
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
              background-color: ${accentColor};
              color: #ffffff;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 6px;
              font-weight: bold;
              margin: 20px 0;
            }
            .button:hover {
              opacity: 0.9;
            }
            .footer {
              text-align: center;
              color: #999999;
              font-size: 14px;
              margin-top: 30px;
            }
            .footer a {
              color: ${accentColor};
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="${dashboardName} Logo" class="logo" />` : ''}
              <h1>${dashboardName}</h1>
            </div>
            <div class="content">
              <p><strong>${distributorName} has invited you to join ${dashboardName}</strong></p>
              <p>You've been invited to create an account on ${dashboardName}, the music distribution platform that puts artists first.</p>
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
              <p>${footerText}</p>
              <p>Need help? Contact your distributor for assistance</p>
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
        from: `${distributorName} <noreply@trackball.cc>`,
        to: [email],
        subject: `You've been invited to ${dashboardName}`,
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
