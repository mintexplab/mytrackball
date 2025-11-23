import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Check, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LabelDesignationWelcomeDialog from "@/components/LabelDesignationWelcomeDialog";

interface LabelDesignationBlockProps {
  labelType: string | null;
  labelName: string | null;
}

interface LabelMembership {
  id: string;
  label_id: string;
  label_name: string;
  role: string;
}

const LABEL_TYPE_DISPLAY: Record<string, { label: string; description: string }> = {
  partner_label: {
    label: "Partner Label",
    description: "You have a custom partner deal with Trackball Distribution"
  },
  signature_label: {
    label: "Signature Label",
    description: "Premium label features with Trackball Signature plan"
  },
  prestige_label: {
    label: "Prestige Label",
    description: "Elite label features with Trackball Prestige plan"
  }
};

export const LabelDesignationBlock = ({ labelType, labelName }: LabelDesignationBlockProps) => {
  const [labels, setLabels] = useState<LabelMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [royaltySplit, setRoyaltySplit] = useState<number | null>(null);

  useEffect(() => {
    fetchLabels();
    checkWelcomeDialog();
    if (labelType === "partner_label") {
      fetchRoyaltySplit();
    }
  }, [labelType]);

  const checkWelcomeDialog = async () => {
    if (!labelType || labelType === "none") return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("label_designation_welcome_shown")
      .eq("id", user.id)
      .single();

    if (profile && !profile.label_designation_welcome_shown) {
      setShowWelcomeDialog(true);
    }
  };

  const handleWelcomeDialogClose = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ label_designation_welcome_shown: true })
      .eq("id", user.id);

    setShowWelcomeDialog(false);
  };

  const fetchRoyaltySplit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("partner_royalty_splits")
      .select("royalty_split_percentage")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setRoyaltySplit(data.royalty_split_percentage);
    }
  };

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

  if (!labelType || !LABEL_TYPE_DISPLAY[labelType]) return null;

  const designation = LABEL_TYPE_DISPLAY[labelType];

  return (
    <>
      <Collapsible defaultOpen>
        <Card className="backdrop-blur-sm bg-card/80 border-primary/20 min-h-[280px] flex flex-col">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-3 sm:pb-6 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-xl font-bold text-left">Your Labels</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-left">
                    {labels.length} {labels.length === 1 ? 'label' : 'labels'} on your account
                  </CardDescription>
                </div>
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex-1">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge className="bg-gradient-primary text-white px-2 py-1 text-xs">
                    {designation.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWelcomeDialog(true)}
                    className="h-7 px-2 text-xs"
                  >
                    <HelpCircle className="w-3 h-3 mr-1" />
                    Setup Guide
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{designation.description}</p>
                {labelType === "partner_label" && royaltySplit !== null && (
                  <div className="mt-2 text-sm font-medium text-primary">
                    Your Royalty Split: {royaltySplit}%
                  </div>
                )}
                {(labelType === "signature_label" || labelType === "prestige_label") && (
                  <div className="mt-2 text-sm font-medium text-green-500">
                    Your Royalty Split: 100%
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : labels.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Labels</p>
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
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No labels found. Create one from the Labels tab.
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {labelType && labelType !== "none" && (
        <LabelDesignationWelcomeDialog
          open={showWelcomeDialog}
          onClose={handleWelcomeDialogClose}
          labelType={labelType as "partner_label" | "signature_label" | "prestige_label"}
        />
      )}
    </>
  );
};
