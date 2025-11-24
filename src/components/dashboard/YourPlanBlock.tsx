import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface YourPlanBlockProps {
  userPlan: any;
}

export const YourPlanBlock = ({ userPlan }: YourPlanBlockProps) => {
  // Check if user is a subaccount and fetch parent plan + label type
  const { data: accountInfo } = useQuery({
    queryKey: ["planBlockAccountInfo"],
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
          plan:plans(name, description, features)
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

  const displayPlan = accountInfo?.isSubaccount ? accountInfo.parentPlan : userPlan;
  const labelType = accountInfo?.labelType;
  const isLabelPlan = labelType && (
    labelType.toLowerCase().includes('label prestige') || 
    labelType.toLowerCase().includes('label signature') || 
    labelType.toLowerCase().includes('label partner')
  );

  return (
    <Collapsible defaultOpen>
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 sm:pb-6 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-xl font-bold text-left">Your Plan</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-left">Current distribution plan</CardDescription>
              </div>
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {accountInfo?.isSubaccount ? (
              <>
                <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                  <p className="text-sm font-semibold mb-1">
                    You are part of an account with {displayPlan?.plan?.name || "Trackball"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your subscription is managed by the account owner
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-gradient-primary text-white px-2 py-1 text-xs">
                    {displayPlan?.plan?.name || "Trackball Free"}
                  </Badge>
                  {isLabelPlan && (
                    <Badge className="bg-gradient-to-r from-accent to-primary text-white px-2 py-1 text-xs">
                      {labelType}
                    </Badge>
                  )}
                </div>
                {displayPlan ? (
                  <>
                    <p className="text-sm text-muted-foreground">{displayPlan.plan.description}</p>
                    {displayPlan.plan.name === "Trackball Partner" ? (
                      <div className="pt-3 border-t border-border">
                        <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                          <p className="text-sm text-foreground">
                            You have a custom partner deal with Trackball Distribution, please ask your label manager about deal offerings
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs font-medium mb-2">Plan Features:</p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {displayPlan.plan.features?.map((feature: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                              <span className="flex-1">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Basic distribution plan with essential features</p>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
