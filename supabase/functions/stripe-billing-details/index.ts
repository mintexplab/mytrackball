import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-BILLING-DETAILS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning empty billing details");
      return new Response(JSON.stringify({ 
        hasStripeAccount: false,
        subscription: null,
        invoices: [],
        paymentMethods: [],
        upcomingInvoice: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Fetch subscription details
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });
    
    const subscription = subscriptions.data.length > 0 ? subscriptions.data[0] : null;
    logStep("Fetched subscription", { hasSubscription: !!subscription });

    // Fetch invoices - optionally include drafts
    const { includeDrafts } = await req.json().catch(() => ({ includeDrafts: false }));
    const invoiceParams: any = {
      customer: customerId,
      limit: 10,
    };
    if (!includeDrafts) {
      invoiceParams.status = 'paid'; // Only fetch paid invoices unless drafts requested
    }
    const invoices = await stripe.invoices.list(invoiceParams);
    logStep("Fetched invoices", { count: invoices.data.length, includeDrafts });

    // Fetch payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    logStep("Fetched payment methods", { count: paymentMethods.data.length });

    // Fetch upcoming invoice if subscription exists
    let upcomingInvoice = null;
    if (subscription) {
      try {
        upcomingInvoice = await stripe.invoices.retrieveUpcoming({
          customer: customerId,
        });
        logStep("Fetched upcoming invoice");
      } catch (error) {
        logStep("No upcoming invoice found");
      }
    }

    return new Response(JSON.stringify({
      hasStripeAccount: true,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at,
        product_id: subscription.items.data[0]?.price.product,
        price_id: subscription.items.data[0]?.price.id,
        amount: subscription.items.data[0]?.price.unit_amount,
        currency: subscription.items.data[0]?.price.currency,
        interval: subscription.items.data[0]?.price.recurring?.interval,
      } : null,
      invoices: invoices.data.map((invoice: any) => ({
        id: invoice.id,
        number: invoice.number,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
      })),
      paymentMethods: paymentMethods.data.map((pm: any) => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
      })),
      upcomingInvoice: upcomingInvoice ? {
        amount_due: upcomingInvoice.amount_due,
        currency: upcomingInvoice.currency,
        period_start: upcomingInvoice.period_start,
        period_end: upcomingInvoice.period_end,
      } : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-billing-details", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
