import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateEmailHTML } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-VERIFICATION-RECEIPT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const { userEmail, userName, paymentDate } = await req.json();
    logStep("Request data received", { userEmail, userName, paymentDate });

    if (!userEmail) {
      throw new Error("User email is required");
    }

    const resend = new Resend(resendKey);

    const formattedDate = new Date(paymentDate).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Toronto'
    });

    const content = `
      <p style="margin: 0 0 16px;">Hi ${userName || 'there'},</p>
      
      <p style="margin: 0 0 16px;">Thank you for verifying your payment method with Trackball Distribution.</p>
      
      <div style="background-color: #1a1a1a; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #dc2626;">
        <h3 style="margin: 0 0 12px; color: #ffffff; font-size: 16px; font-weight: 600;">Payment Receipt</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Description</td>
            <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">Card Verification Fee</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #9ca3af; font-size: 14px;">Date</td>
            <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right;">${formattedDate}</td>
          </tr>
          <tr style="border-top: 1px solid #2a2a2a;">
            <td style="padding: 12px 0 0; color: #ffffff; font-size: 16px; font-weight: 600;">Total Charged</td>
            <td style="padding: 12px 0 0; color: #dc2626; font-size: 18px; font-weight: 700; text-align: right;">$2.29 CAD</td>
          </tr>
        </table>
      </div>
      
      <p style="margin: 0 0 16px;">Your card is now saved for quick payments on future releases and services.</p>
      
      <p style="margin: 0;">This is a one-time charge and will not recur.</p>
    `;

    const emailHtml = generateEmailHTML({
      title: "Card Verification Receipt",
      previewText: "Your $2.29 CAD card verification payment receipt",
      content,
      ctaText: "View Dashboard",
      ctaLink: `${Deno.env.get('SITE_URL') || 'https://my.trackball.cc'}/dashboard`,
    });

    const emailResult = await resend.emails.send({
      from: "Trackball Distribution <noreply@trackball.cc>",
      to: [userEmail],
      subject: "Card Verification Receipt - $2.29 CAD",
      html: emailHtml,
    });

    logStep("Email sent successfully", { emailResult });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-verification-receipt", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
