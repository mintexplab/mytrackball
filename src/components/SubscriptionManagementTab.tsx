import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Package, Users, Building2, FileText, HelpCircle, User, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePlanPermissions } from "@/hooks/usePlanPermissions";

interface SubscriptionManagementTabProps {
  userPlan: any;
  profile: any;
}

export const SubscriptionManagementTab = ({ userPlan, profile }: SubscriptionManagementTabProps) => {
  const { data: accountInfo } = useQuery({
    queryKey: ["subscriptionAccountInfo"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("parent_account_id, label_type")
        .eq("id", user.id)
        .single();

      if (!profileData?.parent_account_id) {
        return { 
          isSubaccount: false, 
          parentPlan: null,
          labelType: profileData?.label_type,
          profile: profileData
        };
      }

      const { data: parentPlan } = await supabase
        .from("user_plans")
        .select(`
          plan_id,
          plan_name,
          status,
          plan:plans(name, description, features)
        `)
        .eq("user_id", profileData.parent_account_id)
        .eq("status", "active")
        .single();

      return {
        isSubaccount: true,
        parentPlan: parentPlan,
        labelType: profileData?.label_type,
        profile: profileData
      };
    },
  });

  const displayPlan = accountInfo?.isSubaccount ? accountInfo.parentPlan : userPlan;
  const labelType = accountInfo?.labelType;
  const permissions = usePlanPermissions(displayPlan, accountInfo?.profile);

  const isLabelPartner = labelType?.toLowerCase() === 'label partner';

  const features = [
    {
      icon: Users,
      label: "User Management",
      description: "Add and manage team members",
      value: permissions.maxUsers === null ? "Unlimited users" : permissions.maxUsers === 1 ? "1 user only" : `Up to ${permissions.maxUsers} users`,
      enabled: permissions.canAddUsers || permissions.maxUsers > 1,
      details: permissions.canAddUsers ? "You can invite team members to collaborate" : "Upgrade to add team members"
    },
    {
      icon: Building2,
      label: "Label Management",
      description: "Create and manage record labels",
      value: permissions.maxLabels === null ? "Unlimited labels" : permissions.maxLabels === 0 ? "No labels" : `Up to ${permissions.maxLabels} label${permissions.maxLabels > 1 ? 's' : ''}`,
      enabled: permissions.canCreateLabels,
      details: permissions.canCreateLabels 
        ? (permissions.canCustomizeLabels ? "Full customization available" : "Basic label features")
        : "Upgrade to create labels"
    },
    {
      icon: FileText,
      label: "Publishing Management",
      description: "Submit and manage publishing rights",
      value: permissions.canAccessPublishing ? "Full access" : "Not available",
      enabled: permissions.canAccessPublishing,
      details: permissions.canAccessPublishing 
        ? "Submit songs, manage royalties, and track publishing"
        : "Available on Label Prestige and Partner plans"
    },
    {
      icon: HelpCircle,
      label: "Support Tickets",
      description: "Priority customer support",
      value: permissions.canAccessTickets ? "Available" : "Basic support only",
      enabled: permissions.canAccessTickets,
      details: permissions.canAccessTickets 
        ? "Create tickets and get priority support"
        : "Upgrade for priority ticket support"
    },
    {
      icon: User,
      label: "Account Manager",
      description: "Dedicated account representative",
      value: permissions.hasAccountManager ? "Dedicated manager assigned" : "Not included",
      enabled: permissions.hasAccountManager,
      details: permissions.hasAccountManager 
        ? "Direct line to your account manager"
        : "Available on Signature plans and above"
    },
    {
      icon: Settings,
      label: "Label Customization",
      description: "Customize label branding",
      value: permissions.canCustomizeLabels ? "Available" : "Not available",
      enabled: permissions.canCustomizeLabels,
      details: permissions.canCustomizeLabels 
        ? "Custom logos, colors, and branding"
        : "Available on Label Signature and above"
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <Package className="w-6 h-6 text-primary" />
                Subscription Management
              </CardTitle>
              <CardDescription>Your current plan and feature access</CardDescription>
            </div>
            {accountInfo?.isSubaccount ? (
              <Badge variant="secondary" className="text-xs">Sub-account</Badge>
            ) : labelType && (
              <Badge className="bg-gradient-to-r from-accent to-primary text-white px-3 py-1">
                {labelType}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {accountInfo?.isSubaccount ? (
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
              <p className="text-sm font-semibold mb-1">
                You are part of an account with {displayPlan?.plan?.name || "Trackball"}
              </p>
              <p className="text-xs text-muted-foreground">
                Your subscription is managed by the account owner. Contact them for plan changes or feature access questions.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <h3 className="text-lg font-bold mb-1">{permissions.planDisplayName}</h3>
                <p className="text-sm text-muted-foreground">
                  Plans are managed by administrators. Contact support for plan changes.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-4 text-foreground">Features & Services</h4>
                <div className="grid gap-4">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg border transition-all ${
                          feature.enabled 
                            ? 'bg-accent/5 border-accent/30 hover:bg-accent/10' 
                            : 'bg-muted/20 border-border/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            feature.enabled ? 'bg-accent/20' : 'bg-muted'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              feature.enabled ? 'text-accent' : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="text-sm font-semibold text-foreground">{feature.label}</h5>
                              {feature.enabled ? (
                                <Check className="w-5 h-5 text-accent flex-shrink-0" />
                              ) : (
                                <X className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{feature.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant={feature.enabled ? "default" : "secondary"} className="text-xs">
                                {feature.value}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 italic">{feature.details}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
