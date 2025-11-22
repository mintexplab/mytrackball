import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppealDecisionRequest {
  userEmail: string;
  userName: string;
  decision: 'approved' | 'rejected';
  adminNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, decision, adminNotes }: AppealDecisionRequest = await req.json();

    const isApproved = decision === 'approved';

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trackball Distribution <noreply@trackball.cc>",
        to: [userEmail],
        subject: `Account Appeal ${isApproved ? 'Approved' : 'Rejected'} - Trackball Distribution`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">Trackball Distribution</h1>
          </div>

          <div style="background-color: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: ${isApproved ? '#10b981' : '#ef4444'}; margin-top: 0;">
              Your appeal has been ${isApproved ? 'approved' : 'rejected'}
            </h2>
            
            <p>Hi ${userName},</p>

            ${isApproved ? `
              <p>Good news! After reviewing your appeal, we have decided to reinstate your Trackball Distribution account.</p>
              
              <div style="background-color: #d1fae5; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
                <p style="margin: 0; color: #065f46;">
                  <strong>Your account has been reactivated.</strong> You can now log in and access all features.
                </p>
              </div>

              <p>We appreciate your patience during this process. Please ensure you follow our terms of service moving forward.</p>
            ` : `
              <p>After careful review of your appeal, we have decided to uphold the account termination.</p>

              ${adminNotes ? `
                <div style="background-color: #fee2e2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
                  <p style="margin: 0; color: #991b1b;">
                    <strong>Reason:</strong><br>
                    ${adminNotes}
                  </p>
                </div>
              ` : ''}

              <p>This decision is final. Your account will remain terminated, and all previously communicated consequences remain in effect.</p>
            `}

            <p style="margin-top: 30px;">
              If you have any questions, please contact our support team.
            </p>

            <div style="text-align: center; margin-top: 30px;">
              <a href="mailto:contact@trackball.cc" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Contact Support
              </a>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© 2025 XZ1 Recording Ventures. All rights reserved.</p>
          </div>
        </div>
      `,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error(`Resend API error: ${emailResponse.statusText}`);
    }

    const result = await emailResponse.json();
    console.log("Appeal decision email sent:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending appeal decision:", error);
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
