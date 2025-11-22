import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LabelInvitationRequest {
  label_name: string;
  master_email: string;
  additional_users: string[];
  subscription_tier: string;
  invitation_id: string;
  service_access?: string[];
  custom_royalty_split?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      label_name, 
      master_email, 
      additional_users, 
      subscription_tier,
      invitation_id,
      service_access,
      custom_royalty_split
    }: LabelInvitationRequest = await req.json();

    const acceptUrl = `${req.headers.get("origin")}/accept-label-invitation?id=${invitation_id}`;

    // Send invitation to master account holder
    const masterEmailResponse = await resend.emails.send({
      from: "Trackball Distribution <onboarding@resend.dev>",
      to: [master_email],
      subject: `You're invited to join Trackball Distribution as ${label_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">Welcome to Trackball Distribution!</h1>
          <p>You've been invited to join Trackball Distribution as the master account holder for <strong>${label_name}</strong>.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Your Label Details</h2>
            <p><strong>Label Name:</strong> ${label_name}</p>
            <p><strong>Subscription Tier:</strong> ${subscription_tier}</p>
            ${subscription_tier === 'Trackball Partner' && custom_royalty_split ? `<p><strong>Royalty Split:</strong> ${custom_royalty_split}% (Custom Deal)</p>` : ''}
            ${subscription_tier === 'Trackball Partner' && service_access && service_access.length > 0 ? `<p><strong>Services Access:</strong> ${service_access.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}</p>` : ''}
            ${additional_users.length > 0 ? `<p><strong>Additional Staff:</strong> ${additional_users.length} users invited</p>` : ''}
          </div>

          <p>Click the button below to accept your invitation and create your account:</p>
          
          <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Accept Invitation & Create Account
          </a>

          <p style="color: #6b7280; font-size: 14px;">This invitation will expire in 30 days.</p>
          
          <p>If you have any questions, please contact us at <a href="mailto:contact@trackball.cc">contact@trackball.cc</a></p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px;">&copy; 2025 XZ1 Recording Ventures. All rights reserved.</p>
        </div>
      `,
    });

    console.log("Master account invitation sent:", masterEmailResponse);

    // Send invitations to additional users
    if (additional_users && additional_users.length > 0) {
      for (const userEmail of additional_users) {
        await resend.emails.send({
          from: "Trackball Distribution <onboarding@resend.dev>",
          to: [userEmail],
          subject: `You're invited to join ${label_name} on Trackball Distribution`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #ef4444;">Join ${label_name} on Trackball!</h1>
              <p>You've been invited to join <strong>${label_name}</strong> as a label staff member on Trackball Distribution.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0;">Invitation Details</h2>
                <p><strong>Label:</strong> ${label_name}</p>
                <p><strong>Subscription Tier:</strong> ${subscription_tier}</p>
                ${subscription_tier === 'Trackball Partner' && custom_royalty_split ? `<p><strong>Royalty Split:</strong> ${custom_royalty_split}% (Custom Deal)</p>` : ''}
                ${subscription_tier === 'Trackball Partner' && service_access && service_access.length > 0 ? `<p><strong>Services Access:</strong> ${service_access.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}</p>` : ''}
              </div>

              <p>Click the button below to accept your invitation and create your account:</p>
              
              <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Accept Invitation & Create Account
              </a>

              <p style="color: #6b7280; font-size: 14px;">This invitation will expire in 30 days.</p>
              
              <p>If you have any questions, please contact us at <a href="mailto:contact@trackball.cc">contact@trackball.cc</a></p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px;">&copy; 2025 XZ1 Recording Ventures. All rights reserved.</p>
            </div>
          `,
        });
      }
      console.log(`Additional user invitations sent to ${additional_users.length} users`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error sending label invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});