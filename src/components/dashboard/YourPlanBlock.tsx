import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Package, Check, X, Users, Building2, FileText, HelpCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePlanPermissions } from "@/hooks/usePlanPermissions";

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
          labelType: profile?.label_type,
          profile 
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
        labelType: profile?.label_type,
        profile
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

  // Get permissions for this plan
  const permissions = usePlanPermissions(displayPlan, accountInfo?.profile);

  const features = [
    {
      icon: Users,
      label: "Users",
      value: permissions.maxUsers === null ? "Unlimited" : permissions.maxUsers === 1 ? "1 user" : `Up to ${permissions.maxUsers} users`,
      enabled: permissions.canAddUsers || permissions.maxUsers > 1
    },
    {
      icon: Building2,
      label: "Labels",
      value: permissions.maxLabels === null ? "Unlimited" : permissions.maxLabels === 0 ? "No labels" : `Up to ${permissions.maxLabels} label${permissions.maxLabels > 1 ? 's' : ''}`,
      enabled: permissions.canCreateLabels
    },
    {
      icon: FileText,
      label: "Publishing",
      value: permissions.canAccessPublishing ? "Available" : "Not available",
      enabled: permissions.canAccessPublishing
    },
    {
      icon: HelpCircle,
      label: "Support Tickets",
      value: permissions.canAccessTickets ? "Available" : "Not available",
      enabled: permissions.canAccessTickets
    },
    {
      icon: User,
      label: "Account Manager",
      value: permissions.hasAccountManager ? "Dedicated manager" : "Not included",
      enabled: permissions.hasAccountManager
    }
  ];

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
          <CardContent className="space-y-4">
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
                  {isLabelPlan ? (
                    <Badge className="bg-gradient-to-r from-accent to-primary text-white px-3 py-1 text-xs">
                      {labelType}
                    </Badge>
                  ) : (
                    <Badge className="bg-gradient-primary text-white px-3 py-1 text-xs">
                      {displayPlan?.plan?.name || "Trackball Free"}
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground self-center">
                    Plans are managed by administrators
                  </p>
                </div>

                {displayPlan?.plan?.description && (
                  <p className="text-sm text-muted-foreground">{displayPlan.plan.description}</p>
                )}

                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium mb-3 text-foreground">Plan Capabilities</p>
                  <div className="grid gap-2">
                    {features.map((feature, index) => {
                      const Icon = feature.icon;
                      return (
                        <div 
                          key={index}
                          className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            feature.enabled 
                              ? 'bg-accent/10 border border-accent/20' 
                              : 'bg-muted/30 border border-border/50'
                          }`}
                        >
                          <div className={`p-1.5 rounded ${
                            feature.enabled ? 'bg-accent/20' : 'bg-muted'
                          }`}>
                            <Icon className={`w-3.5 h-3.5 ${
                              feature.enabled ? 'text-accent' : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">{feature.label}</p>
                            <p className={`text-xs ${
                              feature.enabled ? 'text-muted-foreground' : 'text-muted-foreground/70'
                            }`}>
                              {feature.value}
                            </p>
                          </div>
                          {feature.enabled ? (
                            <Check className="w-4 h-4 text-accent flex-shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {displayPlan?.plan?.name === "Trackball Partner" && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                    <p className="text-xs text-foreground">
                      You have a custom partner deal with Trackball Distribution. Contact your account manager for details.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
