import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppealNotificationRequest {
  userEmail: string;
  userName: string;
  appealReason: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, appealReason }: AppealNotificationRequest = await req.json();

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trackball Distribution <noreply@trackball.cc>",
        to: ["distribution@xz1recordings.ca"],
        subject: `New Account Appeal from ${userName}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">New Account Termination Appeal</h2>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>User Name:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
          </div>

          <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Appeal Reason:</h3>
            <p style="white-space: pre-wrap;">${appealReason}</p>
          </div>

          <p style="color: #666; font-size: 14px;">
            Please review this appeal in the admin portal and make a decision.
          </p>
        </div>
      `,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error(`Resend API error: ${emailResponse.statusText}`);
    }

    const result = await emailResponse.json();
    console.log("Appeal notification sent:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending appeal notification:", error);
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
