import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This edge function handles incoming email webhooks from Resend
// Configure Resend to send webhook to: https://your-project.supabase.co/functions/v1/handle-ticket-email-reply

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received email webhook");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const emailData = await req.json();
    console.log("Email webhook data:", JSON.stringify(emailData, null, 2));

    // Extract ticket ID from email headers or subject
    // Resend webhook structure: https://resend.com/docs/api-reference/webhooks
    const ticketId = emailData.data?.headers?.["x-ticket-id"] || 
                     emailData.data?.subject?.match(/\[Ticket #([a-f0-9-]+)\]/)?.[1];

    if (!ticketId) {
      console.error("No ticket ID found in email");
      return new Response(JSON.stringify({ error: "No ticket ID found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing reply for ticket:", ticketId);

    // Get the ticket to find the user
    const { data: ticket, error: ticketError } = await supabaseClient
      .from("support_tickets")
      .select("user_id, status")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket not found:", ticketError);
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract email body (plain text or HTML)
    const emailBody = emailData.data?.text || emailData.data?.html || emailData.data?.body || "";
    
    // Clean up email body - remove quoted text and signatures
    let cleanedMessage = emailBody
      .split(/\r?\n---\r?\n/)[0] // Remove content after ---
      .split(/On .* wrote:/)[0] // Remove quoted replies
      .split(/From: .*\r?\n/)[0] // Remove forwarded email headers
      .trim();

    if (!cleanedMessage) {
      console.error("Empty message body");
      return new Response(JSON.stringify({ error: "Empty message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate if too long
    if (cleanedMessage.length > 2000) {
      cleanedMessage = cleanedMessage.substring(0, 2000) + "... [truncated]";
    }

    console.log("Adding message to ticket:", { ticketId, messageLength: cleanedMessage.length });

    // Add the reply to ticket messages
    const { error: messageError } = await supabaseClient
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        user_id: ticket.user_id,
        message: cleanedMessage,
        is_admin_reply: false
      });

    if (messageError) {
      console.error("Error adding message:", messageError);
      throw messageError;
    }

    // Update ticket status if it was resolved
    if (ticket.status === "resolved") {
      await supabaseClient
        .from("support_tickets")
        .update({ 
          status: "open",
          updated_at: new Date().toISOString()
        })
        .eq("id", ticketId);
      
      console.log("Ticket reopened due to user reply");
    }

    console.log("Successfully processed email reply");

    return new Response(JSON.stringify({ success: true, ticketId }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in handle-ticket-email-reply:", error);
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
