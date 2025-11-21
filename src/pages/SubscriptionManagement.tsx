import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";

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

const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

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

  const handleManageBilling = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to manage billing");
        return;
      }

      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error accessing customer portal:", error);
      toast.error(error.message || "Failed to access billing portal");
    }
  };

  const isCurrentPlan = (plan: Plan) => {
    return subscriptionStatus?.product_id === plan.stripe_product_id;
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

      <main className="container mx-auto px-4 py-8 relative max-w-4xl">
        {subscriptionStatus?.subscribed && (
          <div className="mb-6 flex justify-end">
            <Button
              onClick={handleManageBilling}
              variant="outline"
              className="border-primary/20"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Billing
            </Button>
          </div>
        )}

        {plansLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {plans?.map((plan) => {
              const isCurrent = isCurrentPlan(plan);
              const isFree = plan.name === "Trackball Free";
              
              return (
                <Card 
                  key={plan.id} 
                  className={`backdrop-blur-sm bg-card/80 border-primary/20 relative ${
                    isCurrent ? "ring-2 ring-primary" : ""
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-4 py-1 rounded-full">
                      <span className="text-xs font-bold text-primary-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Your Plan
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    <CardDescription className="text-3xl font-bold text-foreground mt-2">
                      ${(plan.price / 100).toFixed(2)} CAD/year
                    </CardDescription>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isFree ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        disabled
                      >
                        Free Plan
                      </Button>
                    ) : isCurrent ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleManageBilling}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-gradient-primary hover:opacity-90"
                        onClick={() => handleSubscribe(plan.stripe_price_id!)}
                        disabled={isCreatingCheckout || !plan.stripe_price_id}
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
        )}
      </main>
    </div>
  );
};

export default SubscriptionManagement;
