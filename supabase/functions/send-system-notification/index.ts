import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SystemNotificationRequest {
  type: "payout_request" | "release_submission" | "new_user_signup" | "takedown_request" | "plan_purchase";
  data: {
    userName?: string;
    userEmail?: string;
    userId?: string;
    amount?: number;
    releaseTitle?: string;
    releaseId?: string;
    planName?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data }: SystemNotificationRequest = await req.json();

    let subject = "";
    let html = "";

    switch (type) {
      case "payout_request":
        subject = "New Payout Request";
        html = `
          <h2>New Payout Request</h2>
          <p><strong>User:</strong> ${data.userName} (${data.userEmail})</p>
          <p><strong>User ID:</strong> ${data.userId}</p>
          <p><strong>Amount:</strong> $${data.amount}</p>
          <p>Please review this request in the admin portal.</p>
        `;
        break;

      case "release_submission":
        subject = "New Release Submission";
        html = `
          <h2>New Release Submission</h2>
          <p><strong>User:</strong> ${data.userName} (${data.userEmail})</p>
          <p><strong>Release:</strong> ${data.releaseTitle}</p>
          <p><strong>Release ID:</strong> ${data.releaseId}</p>
          <p>Please review this release in the admin portal.</p>
        `;
        break;

      case "new_user_signup":
        subject = "New User Signup";
        html = `
          <h2>New User Signup</h2>
          <p><strong>Name:</strong> ${data.userName}</p>
          <p><strong>Email:</strong> ${data.userEmail}</p>
          <p><strong>User ID:</strong> ${data.userId}</p>
          <p>A new user has signed up for Trackball Distribution.</p>
        `;
        break;

      case "takedown_request":
        subject = "Takedown Request";
        html = `
          <h2>Takedown Request</h2>
          <p><strong>User:</strong> ${data.userName} (${data.userEmail})</p>
          <p><strong>Release:</strong> ${data.releaseTitle}</p>
          <p><strong>Release ID:</strong> ${data.releaseId}</p>
          <p>Please process this takedown request in the admin portal.</p>
        `;
        break;

      case "plan_purchase":
        subject = "New Plan Purchase";
        html = `
          <h2>New Plan Purchase</h2>
          <p><strong>User:</strong> ${data.userName} (${data.userEmail})</p>
          <p><strong>Plan:</strong> ${data.planName}</p>
          <p>A user has purchased a new subscription plan.</p>
        `;
        break;
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Trackball Distribution <onboarding@resend.dev>",
        to: ["distribution@xz1recordings.ca"],
        subject: `[Trackball] ${subject}`,
        html,
      }),
    });

    const result = await emailResponse.json();
    console.log(`System notification sent: ${type}`, result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-system-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
