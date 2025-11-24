import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string | null;
}

interface UserPlan {
  plan_id: string;
  plan_name: string;
  status: string;
}

const SubscriptionManagement = () => {
  const navigate = useNavigate();

  // Check if user is a subaccount and fetch parent plan if needed
  const { data: accountInfo } = useQuery({
    queryKey: ["accountInfo"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("parent_account_id, label_type")
        .eq("id", user.id)
        .single();

      if (!profile?.parent_account_id) {
        return { 
          isSubaccount: false, 
          parentPlan: null,
          labelType: profile?.label_type 
        };
      }

      // Fetch parent account's plan
      const { data: parentPlan } = await supabase
        .from("user_plans")
        .select(`
          plan_id,
          plan_name,
          status,
          plan:plans(name, description)
        `)
        .eq("user_id", profile.parent_account_id)
        .eq("status", "active")
        .single();

      return {
        isSubaccount: true,
        parentPlan: parentPlan,
        labelType: profile?.label_type
      };
    },
  });

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
    enabled: !accountInfo?.isSubaccount, // Only fetch if not a subaccount
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
              YOUR PLAN
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative max-w-6xl">
        <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Your Current Plan</CardTitle>
            <CardDescription>Plans are managed by administrators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plansLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : accountInfo?.isSubaccount ? (
              <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <p className="text-lg font-semibold mb-2">
                  You are part of an account with {accountInfo.parentPlan?.plan?.name || "Trackball"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Your subscription is managed by the account owner. Please contact the person who invited you if you have questions about plan features.
                </p>
              </div>
            ) : accountInfo?.labelType && (
              accountInfo.labelType.toLowerCase().includes('label prestige') ||
              accountInfo.labelType.toLowerCase().includes('label signature') ||
              accountInfo.labelType.toLowerCase().includes('label partner')
            ) ? (
              <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <h3 className="text-xl font-bold mb-2">{accountInfo.labelType}</h3>
                <p className="text-sm text-muted-foreground">
                  Label Distribution Account
                </p>
              </div>
            ) : userPlan ? (
              <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <h3 className="text-xl font-bold mb-2">{userPlan.plan_name}</h3>
                {plans?.find(p => p.id === userPlan.plan_id)?.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {plans.find(p => p.id === userPlan.plan_id)?.description}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <p className="text-lg font-semibold mb-2">No Active Plan</p>
                <p className="text-sm text-muted-foreground">
                  Please contact an administrator to have a plan assigned to your account.
                </p>
              </div>
            )}
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SubscriptionManagement;
