import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Music, Building2, Users, FileText, HelpCircle } from "lucide-react";
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
        .select("parent_account_id, account_type")
        .eq("id", user.id)
        .single();

      if (!profileData?.parent_account_id) {
        return { 
          isSubaccount: false, 
          accountType: profileData?.account_type,
          profile: profileData
        };
      }

      return {
        isSubaccount: true,
        accountType: profileData?.account_type,
        profile: profileData
      };
    },
  });

  const permissions = usePlanPermissions(userPlan, accountInfo?.profile);
  const isLabel = permissions.accountType === "label";

  const features = isLabel ? [
    {
      icon: Building2,
      label: "Unlimited Labels",
      description: "Create and manage multiple record labels",
      enabled: true,
    },
    {
      icon: Users,
      label: "Unlimited Users",
      description: "Add team members and collaborators",
      enabled: true,
    },
    {
      icon: FileText,
      label: "Publishing Management",
      description: "Submit and manage publishing rights",
      enabled: true,
    },
    {
      icon: HelpCircle,
      label: "Priority Support",
      description: "Access to support tickets and account manager",
      enabled: true,
    },
  ] : [
    {
      icon: Music,
      label: "3 Artist Names",
      description: "Release music under up to 3 different artist names",
      enabled: true,
    },
    {
      icon: Building2,
      label: "1 Label",
      description: "Create one label for your releases",
      enabled: true,
    },
    {
      icon: HelpCircle,
      label: "Support Tickets",
      description: "Access to support when you need help",
      enabled: true,
    },
    {
      icon: FileText,
      label: "Publishing",
      description: "Publishing management",
      enabled: false,
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                {isLabel ? (
                  <Building2 className="w-6 h-6 text-primary" />
                ) : (
                  <Music className="w-6 h-6 text-primary" />
                )}
                Your Account
              </CardTitle>
              <CardDescription>Account type and features</CardDescription>
            </div>
            <Badge className="bg-gradient-to-r from-accent to-primary text-white px-3 py-1">
              {permissions.planDisplayName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
            <h3 className="text-lg font-bold mb-1">{permissions.planDisplayName}</h3>
            <p className="text-sm text-muted-foreground">
              {isLabel 
                ? "Full access to all label management features and tools."
                : "Distribute your music under up to 3 artist names with 1 label."}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4 text-foreground">Your Features</h4>
            <div className="grid gap-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border transition-all ${
                      feature.enabled 
                        ? 'bg-accent/5 border-accent/30' 
                        : 'bg-muted/20 border-border/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        feature.enabled ? 'bg-accent/20' : 'bg-muted'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          feature.enabled ? 'text-accent' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-foreground">{feature.label}</h5>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                      {feature.enabled ? (
                        <Check className="w-5 h-5 text-accent" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="text-sm font-semibold mb-2">Distribution Pricing</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• <span className="font-medium text-foreground">$5 CAD</span> per track</p>
              <p>• <span className="font-medium text-foreground">$8 CAD</span> UPC fee per release</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
