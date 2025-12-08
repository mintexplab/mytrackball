import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PAYMENT-RECEIPT] ${step}${detailsStr}`);
};

interface ReceiptRequest {
  email: string;
  userName: string;
  releaseTitle: string;
  artistName: string;
  amount: number;
  trackCount: number;
  paymentDate: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const { email, userName, releaseTitle, artistName, amount, trackCount, paymentDate }: ReceiptRequest = await req.json();
    
    if (!email || !releaseTitle || !artistName) {
      throw new Error("Missing required fields: email, releaseTitle, artistName");
    }

    logStep("Sending receipt", { email, releaseTitle, amount });

    const resend = new Resend(resendKey);
    const formattedAmount = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount / 100);

    const trackFee = (trackCount * 500) / 100;
    const upcFee = 8;

    const emailResponse = await resend.emails.send({
      from: "Trackball Distribution <contact@trackball.cc>",
      to: [email],
      subject: `Payment Receipt - ${releaseTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #171717; border-radius: 12px; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Payment Receipt</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #a1a1aa; margin: 0 0 20px 0; font-size: 16px;">
                        Hi ${userName || 'there'},
                      </p>
                      <p style="color: #a1a1aa; margin: 0 0 30px 0; font-size: 16px;">
                        Thank you for your payment! Your release has been submitted for distribution.
                      </p>
                      
                      <!-- Release Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #262626; border-radius: 8px; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 20px;">
                            <h2 style="color: #ffffff; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Release Details</h2>
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="color: #a1a1aa; padding: 5px 0; font-size: 14px;">Title:</td>
                                <td style="color: #ffffff; padding: 5px 0; font-size: 14px; text-align: right; font-weight: 500;">${releaseTitle}</td>
                              </tr>
                              <tr>
                                <td style="color: #a1a1aa; padding: 5px 0; font-size: 14px;">Artist:</td>
                                <td style="color: #ffffff; padding: 5px 0; font-size: 14px; text-align: right; font-weight: 500;">${artistName}</td>
                              </tr>
                              <tr>
                                <td style="color: #a1a1aa; padding: 5px 0; font-size: 14px;">Tracks:</td>
                                <td style="color: #ffffff; padding: 5px 0; font-size: 14px; text-align: right; font-weight: 500;">${trackCount}</td>
                              </tr>
                              <tr>
                                <td style="color: #a1a1aa; padding: 5px 0; font-size: 14px;">Date:</td>
                                <td style="color: #ffffff; padding: 5px 0; font-size: 14px; text-align: right; font-weight: 500;">${paymentDate}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Payment Breakdown -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #262626; border-radius: 8px; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 20px;">
                            <h2 style="color: #ffffff; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Payment Breakdown</h2>
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="color: #a1a1aa; padding: 5px 0; font-size: 14px;">Track Fee (${trackCount} × $5.00):</td>
                                <td style="color: #ffffff; padding: 5px 0; font-size: 14px; text-align: right;">$${trackFee.toFixed(2)} CAD</td>
                              </tr>
                              <tr>
                                <td style="color: #a1a1aa; padding: 5px 0; font-size: 14px;">UPC Fee:</td>
                                <td style="color: #ffffff; padding: 5px 0; font-size: 14px; text-align: right;">$${upcFee.toFixed(2)} CAD</td>
                              </tr>
                              <tr>
                                <td colspan="2" style="border-top: 1px solid #404040; padding-top: 10px; margin-top: 10px;"></td>
                              </tr>
                              <tr>
                                <td style="color: #ffffff; padding: 10px 0 0 0; font-size: 16px; font-weight: 600;">Total Paid:</td>
                                <td style="color: #22c55e; padding: 10px 0 0 0; font-size: 16px; text-align: right; font-weight: 600;">${formattedAmount}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #a1a1aa; margin: 0 0 20px 0; font-size: 14px;">
                        Your release is now pending review. You'll receive another email once it's approved and distributed to streaming platforms.
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="https://my.trackball.cc/dashboard" 
                               style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                              View Dashboard
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #0a0a0a; padding: 25px 30px; text-align: center; border-top: 1px solid #262626;">
                      <p style="color: #71717a; margin: 0 0 10px 0; font-size: 12px;">
                        This is an automated receipt from Trackball Distribution.
                      </p>
                      <p style="color: #71717a; margin: 0; font-size: 12px;">
                        Questions? Contact us at <a href="mailto:contact@trackball.cc" style="color: #dc2626; text-decoration: none;">contact@trackball.cc</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    logStep("Receipt email sent successfully", { emailResponse });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("ERROR in send-payment-receipt", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
