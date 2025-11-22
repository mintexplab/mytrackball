import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { generateEmailHTML } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  label_name: z.string().min(1).max(100),
  master_email: z.string().email().max(255),
  additional_users: z.array(z.string().email()).default([]),
  subscription_tier: z.enum(["Trackball Signature", "Trackball Prestige", "Trackball Partner"]),
  invitation_id: z.string().uuid(),
  service_access: z.array(z.string()).optional(),
  custom_royalty_split: z.number().min(0).max(100).optional(),
  invited_role: z.enum(['owner', 'sublabel_admin', 'member']).default('member'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json();
    const validated = requestSchema.parse(body);

    // Detect domain for invitation links
    const origin = req.headers.get("origin") || "";
    const isDev = origin.includes("lovable.app");
    const baseUrl = isDev ? "https://mytrackball.lovable.app" : "https://pvt-my.trackball.cc";

    // Process master account email
    const { data: masterProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', validated.master_email)
      .maybeSingle();

    if (masterProfile) {
      // Existing user - no email, in-app invitation only
      console.log(`Master account ${validated.master_email} exists - creating in-app invitation`);
    } else {
      // New user - send invitation email
      const acceptUrl = `${baseUrl}/accept-label-invitation?id=${validated.invitation_id}`;
      
      const tierDetails = validated.subscription_tier === 'Trackball Partner' && validated.custom_royalty_split
        ? `Custom Deal: ${validated.custom_royalty_split}% royalty split`
        : validated.subscription_tier;

      const servicesAccess = validated.subscription_tier === 'Trackball Partner' && validated.service_access && validated.service_access.length > 0
        ? validated.service_access.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
        : '';

      const emailContent = `
        <div style="margin-bottom: 24px;">
          <h2 style="color: #ef4444; font-size: 28px; margin-bottom: 16px;">Welcome to the Future of Music Distribution</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            You've been invited to join <strong style="color: #ef4444;">${validated.label_name}</strong> on Trackball Distribution—where independent labels and artists take control of their music, their data, and their success.
          </p>
        </div>

        <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 28px; border-radius: 12px; border: 1px solid #ef4444; margin: 24px 0;">
          <h3 style="color: #ef4444; margin-top: 0; font-size: 20px; margin-bottom: 16px;">Your Label Invitation Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Label Name</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: 600; text-align: right;">${validated.label_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Subscription Tier</td>
              <td style="padding: 8px 0; color: #ef4444; font-weight: 600; text-align: right;">${tierDetails}</td>
            </tr>
            ${servicesAccess ? `
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Services Included</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: 600; text-align: right; font-size: 13px;">${servicesAccess}</td>
            </tr>
            ` : ''}
            ${validated.additional_users.length > 0 ? `
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Team Size</td>
              <td style="padding: 8px 0; color: #ffffff; font-weight: 600; text-align: right;">${validated.additional_users.length + 1} members</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Your Role</td>
              <td style="padding: 8px 0; color: #ef4444; font-weight: 600; text-align: right;">Master Account Owner</td>
            </tr>
          </table>
        </div>

        <div style="margin: 32px 0;">
          <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 20px;">
            Trackball Distribution empowers you with industry-leading tools: lightning-fast distribution to all major DSPs, transparent royalty tracking, comprehensive publishing administration, and direct support from real music industry professionals—not bots.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Your music. Your terms. Your success.
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);">
            Accept Invitation & Create Your Account
          </a>
        </div>

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            <strong>⏰ Important:</strong> This invitation expires in 30 days. Click above to secure your spot and start distributing your music to the world.
          </p>
        </div>

        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Questions? Our dedicated support team is here to help. Reach out to us at 
            <a href="mailto:distribution@xz1recordings.ca" style="color: #ef4444; text-decoration: none;">distribution@xz1recordings.ca</a>
          </p>
        </div>
      `;

      const emailHtml = generateEmailHTML({
        title: `Join ${validated.label_name} on Trackball Distribution`,
        previewText: `You've been invited to join ${validated.label_name} as the master account owner`,
        content: emailContent,
        ctaText: "Accept Invitation & Get Started",
        ctaLink: acceptUrl,
      });

      await resend.emails.send({
        from: "Trackball Distribution <distribution@xz1recordings.ca>",
        to: [validated.master_email],
        subject: `You're Invited: Join ${validated.label_name} on Trackball Distribution`,
        html: emailHtml,
      });

      console.log(`Invitation email sent to new user: ${validated.master_email}`);
    }

    // Process additional users
    for (const userEmail of validated.additional_users) {
      const { data: additionalProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', userEmail)
        .maybeSingle();

      if (additionalProfile) {
        // Existing user - in-app invitation only
        console.log(`Additional user ${userEmail} exists - creating in-app invitation`);
      } else {
        // New user - send invitation email
        const acceptUrl = `${baseUrl}/accept-label-invitation?id=${validated.invitation_id}`;
        
        const emailContent = `
          <div style="margin-bottom: 24px;">
            <h2 style="color: #ef4444; font-size: 28px; margin-bottom: 16px;">You've Been Invited to Join a Label Team</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              <strong style="color: #ef4444;">${validated.label_name}</strong> has invited you to join their team on Trackball Distribution—the modern platform built for independent music labels and artists who demand transparency, control, and results.
            </p>
          </div>

          <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 28px; border-radius: 12px; border: 1px solid #ef4444; margin: 24px 0;">
            <h3 style="color: #ef4444; margin-top: 0; font-size: 20px; margin-bottom: 16px;">Invitation Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Label</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 600; text-align: right;">${validated.label_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Subscription Tier</td>
                <td style="padding: 8px 0; color: #ef4444; font-weight: 600; text-align: right;">${validated.subscription_tier}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Your Role</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 600; text-align: right;">Team Member</td>
              </tr>
            </table>
          </div>

          <div style="margin: 32px 0;">
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              As part of ${validated.label_name}'s team, you'll have access to powerful tools for music distribution, royalty management, and industry-standard analytics—all in one seamless dashboard designed to help labels thrive in today's music ecosystem.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);">
              Accept Invitation & Join the Team
            </a>
          </div>

          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              <strong>⏰ Important:</strong> This invitation expires in 30 days. Accept now to start collaborating with ${validated.label_name}.
            </p>
          </div>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
              Need help getting started? Contact us at 
              <a href="mailto:distribution@xz1recordings.ca" style="color: #ef4444; text-decoration: none;">distribution@xz1recordings.ca</a>
            </p>
          </div>
        `;

        const emailHtml = generateEmailHTML({
          title: `Join ${validated.label_name} on Trackball`,
          previewText: `${validated.label_name} has invited you to join their team`,
          content: emailContent,
          ctaText: "Accept Invitation & Join",
          ctaLink: acceptUrl,
        });

        await resend.emails.send({
          from: "Trackball Distribution <distribution@xz1recordings.ca>",
          to: [userEmail],
          subject: `Team Invitation: Join ${validated.label_name} on Trackball Distribution`,
          html: emailHtml,
        });

        console.log(`Invitation email sent to additional user: ${userEmail}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Invitations processed successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error sending label invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send invitation' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
