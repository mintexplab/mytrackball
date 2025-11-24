import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Check, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LabelMembership {
  id: string;
  label_id: string;
  label_name: string;
  role: string;
}

interface PlanAndLabelsBlockProps {
  userPlan: any;
  labelType: string | null;
  labelName: string | null;
}

const LABEL_TYPE_DISPLAY: Record<string, { label: string; description: string }> = {
  partner_label: {
    label: "Partner Label",
    description: "Custom partner deal with Trackball"
  },
  signature_label: {
    label: "Signature Label",
    description: "Premium label with Signature plan"
  },
  prestige_label: {
    label: "Prestige Label",
    description: "Elite label with Prestige plan"
  }
};

export const PlanAndLabelsBlock = ({ userPlan, labelType, labelName }: PlanAndLabelsBlockProps) => {
  const [labels, setLabels] = useState<LabelMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_label_memberships")
        .select("*")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      setLabels(data || []);
    } catch (error) {
      console.error("Error fetching labels:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasLabelDesignation = labelType && LABEL_TYPE_DISPLAY[labelType];
  const designation = hasLabelDesignation ? LABEL_TYPE_DISPLAY[labelType] : null;

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20 min-h-[280px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-xl font-bold flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Plan & Labels
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <Tabs defaultValue="plan" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plan">Your Plan</TabsTrigger>
            <TabsTrigger value="labels">Your Labels</TabsTrigger>
          </TabsList>
          
          <TabsContent value="plan" className="space-y-3 mt-4">
            {hasLabelDesignation ? (
              <div className="p-3 rounded-lg bg-gradient-primary/10 border border-primary/20">
                <h3 className="font-semibold text-lg text-foreground">
                  {designation.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {designation.description}
                </p>
              </div>
            ) : userPlan ? (
              <>
                <div className="p-3 rounded-lg bg-gradient-primary/10 border border-primary/20">
                  <h3 className="font-semibold text-lg text-foreground">
                    {userPlan.plan.name}
                  </h3>
                  {userPlan.plan.price > 0 && (
                    <p className="text-sm text-muted-foreground">
                      ${userPlan.plan.price} CAD/year
                    </p>
                  )}
                </div>
                
                {userPlan.plan.description && (
                  <p className="text-sm text-muted-foreground">
                    {userPlan.plan.description}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active plan</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="labels" className="space-y-3 mt-4">
            {designation && (
              <div className="space-y-2 pb-3 border-b border-border">
                <Badge className="bg-gradient-primary text-white px-2 py-1 text-xs">
                  {designation.label}
                </Badge>
                <p className="text-xs text-muted-foreground">{designation.description}</p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : labels.length > 0 ? (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {label.label_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {label.role}
                        </p>
                      </div>
                    </div>
                    {label.label_name === labelName && (
                      <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10 flex-shrink-0">
                        <Check className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Building2 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No labels found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
