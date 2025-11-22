import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching all user profiles for security unlock notification");

    // Get all user emails
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .not("email", "is", null);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      console.log("No users found to notify");
      return new Response(
        JSON.stringify({ message: "No users to notify" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Sending unlock notifications to ${profiles.length} users`);

    // Send email to each user
    const emailPromises = profiles.map((profile) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Trackball Distribution <noreply@trackball.cc>",
          to: [profile.email],
          subject: "Trackball Distribution is Now Unlocked",
          html: `
            <div style="font-family: 'Rubik', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #000000; color: #ffffff;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #ef4444; margin-bottom: 10px;">Trackball Distribution</h1>
                <div style="width: 60px; height: 2px; background: linear-gradient(to right, #ef4444, #dc2626); margin: 0 auto;"></div>
              </div>
              
              <div style="background-color: #1a1a1a; border: 1px solid #ef444420; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin-top: 0;">Platform Unlocked</h2>
                <p style="color: #a3a3a3; line-height: 1.6; margin-bottom: 20px;">
                  Good news! The security issue affecting Trackball Distribution has been resolved. 
                </p>
                <p style="color: #a3a3a3; line-height: 1.6; margin-bottom: 20px;">
                  You can now access your account and all features are fully operational.
                </p>
                <p style="color: #a3a3a3; line-height: 1.6; margin-bottom: 20px;">
                  Thank you for your patience and understanding during this time.
                </p>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://trackball.lovable.app" 
                     style="display: inline-block; background: linear-gradient(to right, #ef4444, #dc2626); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">
                    Access Your Dashboard
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; color: #737373; font-size: 12px; margin-top: 30px;">
                <p>Need help? Contact us at <a href="mailto:contact@trackball.cc" style="color: #ef4444; text-decoration: none;">contact@trackball.cc</a></p>
                <p style="margin-top: 10px;">© 2025 XZ1 Recording Ventures. All rights reserved.</p>
              </div>
            </div>
          `,
        }),
      }).then(res => res.ok ? res.json() : Promise.reject(res))
    );

    const results = await Promise.allSettled(emailPromises);
    
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Security unlock emails sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: "Security unlock notifications sent",
        successful,
        failed,
        total: profiles.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in send-security-unlock-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});