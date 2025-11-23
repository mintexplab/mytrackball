import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CheckCircle2, CreditCard, FileText, Calendar, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

interface UserPlan {
  plan_id: string;
  plan_name: string;
  status: string;
}

interface BillingDetails {
  hasStripeAccount: boolean;
  subscription: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    canceled_at: number | null;
    product_id: string;
    price_id: string;
    amount: number;
    currency: string;
    interval: string;
  } | null;
  invoices: Array<{
    id: string;
    number: string | null;
    amount_paid: number;
    amount_due: number;
    currency: string;
    status: string;
    created: number;
    hosted_invoice_url: string | null;
    invoice_pdf: string | null;
  }>;
  paymentMethods: Array<{
    id: string;
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  }>;
  upcomingInvoice: {
    amount_due: number;
    currency: string;
    period_start: number;
    period_end: number;
  } | null;
}

const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  // Fetch user's current plan from database
  const { data: userPlan } = useQuery({
    queryKey: ["userPlan"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_plans")
        .select("plan_id, plan_name, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();
      
      if (error) {
        console.error("Error fetching user plan:", error);
        return null;
      }
      return data as UserPlan;
    },
  });

  // Fetch plans from database
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("price", { ascending: true });
      
      if (error) throw error;
      return data as Plan[];
    },
  });

  // Fetch billing details from Stripe
  const { data: billingDetails, isLoading: billingLoading, refetch: refetchBilling } = useQuery({
    queryKey: ["billingDetails"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase.functions.invoke("stripe-billing-details", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data as BillingDetails;
    },
  });

  // Check subscription status
  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setSubscriptionStatus(data);
    } catch (error: any) {
      console.error("Error checking subscription:", error);
      toast.error("Failed to check subscription status");
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    if (!priceId) {
      toast.error("This plan is not available for purchase");
      return;
    }

    setIsCreatingCheckout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to subscribe");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, "_blank");
        // Refresh subscription status after a delay
        setTimeout(() => checkSubscription(), 3000);
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error(error.message || "Failed to create checkout session");
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const isCurrentPlan = (plan: Plan) => {
    // Priority: Stripe subscription overrides database plan assignment
    // This ensures only ONE plan shows as active
    if (subscriptionStatus?.subscribed && subscriptionStatus?.product_id) {
      // If user has active Stripe subscription, match against that
      return subscriptionStatus.product_id === plan.stripe_product_id;
    }
    // If no Stripe subscription, use database plan assignment
    return userPlan?.plan_id === plan.id;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-primary opacity-5 blur-3xl" />
      
      <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              MANAGE SUBSCRIPTION
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative max-w-6xl">
        {plansLoading || billingLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="billing">Billing History</TabsTrigger>
              <TabsTrigger value="payment">Payment Methods</TabsTrigger>
              <TabsTrigger value="plans">All Plans</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Current Plan */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Your Current Plan</h2>
                {plans?.map((plan) => {
                  const isCurrent = isCurrentPlan(plan);
                  if (!isCurrent) return null;
                  
                  return (
                    <Card key={plan.id} className="backdrop-blur-sm bg-card/80 border-primary/20 ring-2 ring-primary">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                            <CardDescription className="text-3xl font-bold text-foreground mt-2">
                              ${plan.price.toFixed(2)} CAD/year
                            </CardDescription>
                          </div>
                          <Badge className="bg-primary">Active</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {billingDetails?.subscription && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Status</span>
                              <Badge variant={billingDetails.subscription.status === 'active' ? 'default' : 'secondary'}>
                                {billingDetails.subscription.status}
                              </Badge>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Current Period</span>
                              <span>{formatDate(billingDetails.subscription.current_period_start)} - {formatDate(billingDetails.subscription.current_period_end)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Renewal Date</span>
                              <span>{formatDate(billingDetails.subscription.current_period_end)}</span>
                            </div>
                            {billingDetails.subscription.cancel_at_period_end && (
                              <div className="flex justify-between text-sm">
                                <span className="text-destructive">Cancels At</span>
                                <span className="text-destructive">{formatDate(billingDetails.subscription.current_period_end)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Upcoming Invoice */}
              {billingDetails?.upcomingInvoice && (
                <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Next Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount Due</span>
                        <span className="text-2xl font-bold">
                          {formatCurrency(billingDetails.upcomingInvoice.amount_due, billingDetails.upcomingInvoice.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Billing Period</span>
                        <span>{formatDate(billingDetails.upcomingInvoice.period_start)} - {formatDate(billingDetails.upcomingInvoice.period_end)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Billing History Tab */}
            <TabsContent value="billing" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Billing History</h2>
                <Button variant="outline" size="sm" onClick={() => refetchBilling()}>
                  Refresh
                </Button>
              </div>
              
              {billingDetails?.invoices && billingDetails.invoices.length > 0 ? (
                <div className="space-y-3">
                  {billingDetails.invoices.map((invoice) => (
                    <Card key={invoice.id} className="backdrop-blur-sm bg-card/80 border-primary/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                            <div>
                              <p className="font-semibold">{invoice.number || invoice.id}</p>
                              <p className="text-sm text-muted-foreground">{formatDate(invoice.created)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(invoice.amount_paid, invoice.currency)}</p>
                              <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                                {invoice.status}
                              </Badge>
                            </div>
                            {invoice.invoice_pdf && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No billing history available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Payment Methods Tab */}
            <TabsContent value="payment" className="space-y-4">
              <h2 className="text-2xl font-bold">Payment Methods</h2>
              
              {billingDetails?.paymentMethods && billingDetails.paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {billingDetails.paymentMethods.map((pm) => (
                    <Card key={pm.id} className="backdrop-blur-sm bg-card/80 border-primary/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <CreditCard className="w-8 h-8 text-muted-foreground" />
                            <div>
                              <p className="font-semibold capitalize">{pm.brand} •••• {pm.last4}</p>
                              <p className="text-sm text-muted-foreground">Expires {pm.exp_month}/{pm.exp_year}</p>
                            </div>
                          </div>
                          <Badge>Default</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                  <CardContent className="py-12 text-center">
                    <CreditCard className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No payment methods on file</p>
                  </CardContent>
                </Card>
              )}

              {billingDetails?.hasStripeAccount && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open("https://billing.stripe.com/p/login/aFa3cw74O4B9bK22tTa7C00", "_blank")}
                >
                  Manage Payment Methods in Stripe
                </Button>
              )}
            </TabsContent>

            {/* All Plans Tab */}
            <TabsContent value="plans" className="space-y-4">
              <h2 className="text-2xl font-bold">Available Plans</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {plans?.map((plan) => {
                  const isCurrent = isCurrentPlan(plan);
                  const isFree = plan.name === "Trackball Free";
                  const isPartner = plan.name === "Trackball Partner";
                  
                  return (
                    <Card 
                      key={plan.id} 
                      className={`backdrop-blur-sm bg-card/80 ${isCurrent ? 'border-primary/20 ring-2 ring-primary' : 'border-primary/20'}`}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                          {isCurrent && <Badge className="bg-primary">Current</Badge>}
                        </div>
                        <CardDescription className="text-3xl font-bold text-foreground mt-2">
                          ${plan.price.toFixed(2)} CAD/year
                        </CardDescription>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {isCurrent ? (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            This is your current plan
                          </p>
                        ) : isFree || isPartner || !plan.stripe_price_id ? (
                          <Button className="w-full" variant="outline" disabled>
                            {isPartner ? "Invitation Only" : "Not Available"}
                          </Button>
                        ) : (
                          <Button
                            className="w-full bg-gradient-primary hover:opacity-90"
                            onClick={() => handleSubscribe(plan.stripe_price_id!)}
                            disabled={isCreatingCheckout}
                          >
                            {isCreatingCheckout ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              "Subscribe"
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default SubscriptionManagement;
