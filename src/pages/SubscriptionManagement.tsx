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

interface UserPlan {
  plan_id: string;
  plan_name: string;
  status: string;
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

      <main className="container mx-auto px-4 py-8 relative max-w-4xl">
        {plansLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Current Plan Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4 text-left">Your Plan</h2>
              {plans?.map((plan) => {
                const isCurrent = isCurrentPlan(plan);
                if (!isCurrent) return null;
                
                return (
                  <Card 
                    key={plan.id} 
                    className="backdrop-blur-sm bg-card/80 border-primary/20 ring-2 ring-primary"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl font-bold text-left">{plan.name}</CardTitle>
                          <CardDescription className="text-3xl font-bold text-foreground mt-2 text-left">
                            ${plan.price.toFixed(2)} CAD/year
                          </CardDescription>
                          {plan.description && (
                            <p className="text-sm text-muted-foreground mt-2 text-left">{plan.description}</p>
                          )}
                        </div>
                        <div className="bg-primary px-4 py-1 rounded-full">
                          <span className="text-xs font-bold text-primary-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {subscriptionStatus?.subscribed && plan.name !== "Trackball Free" ? (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={handleManageBilling}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Billing
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center">
                          {plan.name === "Trackball Free" 
                            ? "This is your current plan" 
                            : "Plan assigned by administrator"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Available Plans Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4 text-left">Available Plans</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {plans?.map((plan) => {
                  const isCurrent = isCurrentPlan(plan);
                  if (isCurrent) return null; // Don't show current plan here
                  
                  const isFree = plan.name === "Trackball Free";
                  const isPartner = plan.name === "Trackball Partner";
                  
                  return (
                    <Card 
                      key={plan.id} 
                      className="backdrop-blur-sm bg-card/80 border-primary/20"
                    >
                      <CardHeader>
                        <CardTitle className="text-2xl font-bold text-left">{plan.name}</CardTitle>
                        <CardDescription className="text-3xl font-bold text-foreground mt-2 text-left">
                          ${plan.price.toFixed(2)} CAD/year
                        </CardDescription>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mt-2 text-left">{plan.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {isFree || isPartner || !plan.stripe_price_id ? (
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled
                          >
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SubscriptionManagement;
