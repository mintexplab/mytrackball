import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateEmailHTML } from '../_shared/email-template.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      throw new Error('Email address is required');
    }

    const emailHTML = generateEmailHTML({
      title: 'Test Email - Trackball Distribution',
      previewText: 'This is a test email from your new Trackball Distribution email system',
      content: `
        <p>Hello!</p>
        <p>This is a test email to verify that your new email system is working correctly.</p>
        <p><strong>New features:</strong></p>
        <ul style="line-height: 1.8;">
          <li>Professional branded email template with logo</li>
          <li>Responsive design for all devices</li>
          <li>Black and red Trackball branding</li>
          <li>Consistent styling across all platform emails</li>
        </ul>
        <p>If you're seeing this email, everything is working perfectly! 🎉</p>
      `,
      ctaText: 'Visit Dashboard',
      ctaLink: 'https://trackball.cc/dashboard',
      footerText: 'This is a test email. Need help? Contact us at contact@trackball.cc'
    });

    const result = await resend.emails.send({
      from: 'Trackball Distribution <noreply@trackball.cc>',
      to: [email],
      subject: '🎵 Test Email - Trackball Distribution',
      html: emailHTML,
    });

    console.log('Test email sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test email sent to ${email}`,
        emailId: result.data?.id 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
