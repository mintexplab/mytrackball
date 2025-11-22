import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateEmailHTML } from '../_shared/email-template.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  userIds: string[] | "all";
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Verify user is admin using the has_role function
    const { data: isAdmin, error: roleError } = await supabaseClient
      .rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

    if (roleError || !isAdmin) {
      throw new Error("Not authorized - admin only");
    }

    const { userIds, subject, message }: EmailRequest = await req.json();

    console.log("Email request:", { userIds: userIds === "all" ? "all users" : userIds.length, subject });

    let recipients: string[] = [];

    if (userIds === "all") {
      // Fetch all user emails
      const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("email");

      if (profilesError) throw profilesError;

      recipients = profiles.map(p => p.email);
      console.log(`Sending to all users: ${recipients.length} recipients`);
    } else {
      // Fetch specific user emails
      const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      recipients = profiles.map(p => p.email);
      console.log(`Sending to selected users: ${recipients.length} recipients`);
    }

    if (recipients.length === 0) {
      throw new Error("No recipients found");
    }

    // Send emails in batches to avoid rate limits
    const batchSize = 100;
    const results = [];

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (email) => {
        try {
          const emailHTML = generateEmailHTML({
            title: subject,
            previewText: subject,
            content: message.replace(/\n/g, '<br>'),
            footerText: 'Need help? Contact us at contact@trackball.cc'
          });

          const result = await resend.emails.send({
            from: "Trackball Distribution <noreply@trackball.cc>",
            to: [email],
            subject: subject,
            html: emailHTML,
          });
          console.log(`Email sent to ${email}:`, result);
          return { email, success: true, id: result.data?.id };
        } catch (error: any) {
          console.error(`Failed to send email to ${email}:`, error);
          return { email, success: false, error: error?.message || "Unknown error" };
        }
      });

      const batchResults = await Promise.all(emailPromises);
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Email sending complete: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        successCount,
        failureCount,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-user-email function:", error);
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
