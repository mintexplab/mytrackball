import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

interface LabelDesignationBlockProps {
  labelType: string | null;
  labelName: string | null;
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
  if (!labelType || !LABEL_TYPE_DISPLAY[labelType]) return null;

  const designation = LABEL_TYPE_DISPLAY[labelType];

  return (
    <Collapsible defaultOpen>
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 sm:pb-6 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-xl font-bold text-left">Your Label</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-left">Label designation</CardDescription>
              </div>
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Badge className="bg-gradient-primary text-white px-2 py-1 text-xs">
                {designation.label}
              </Badge>
              {labelName && (
                <p className="text-sm font-medium text-foreground">
                  {labelName}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{designation.description}</p>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                You can create and manage multiple labels from the Labels tab
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
