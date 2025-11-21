import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CollaboratorNotificationRequest {
  collaboratorName: string;
  collaboratorEmail: string;
  inviterName: string;
  releaseTitle?: string;
  percentage?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      collaboratorName, 
      collaboratorEmail, 
      inviterName, 
      releaseTitle,
      percentage 
    }: CollaboratorNotificationRequest = await req.json();

    let subject = "You've Been Added as a Collaborator";
    let html = `
      <h2>Collaborator Notification</h2>
      <p>Hello ${collaboratorName},</p>
      <p><strong>${inviterName}</strong> has added you as a collaborator on Trackball Distribution.</p>
    `;

    if (releaseTitle && percentage) {
      html += `
        <p><strong>Release:</strong> ${releaseTitle}</p>
        <p><strong>Royalty Percentage:</strong> ${percentage}%</p>
        <p>This means you will receive ${percentage}% of the royalties from this release.</p>
      `;
    }

    html += `
      <p>Your royalty earnings will be tracked in the Trackball Distribution system.</p>
      <p>For any questions, please contact <a href="mailto:contact@trackball.cc">contact@trackball.cc</a></p>
      <br>
      <p>Best regards,<br>The Trackball Distribution Team</p>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trackball Distribution <notifications@trackball.cc>",
        to: [collaboratorEmail],
        subject,
        html,
      }),
    });

    const result = await emailResponse.json();
    console.log("Collaborator notification sent:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-collaborator-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
