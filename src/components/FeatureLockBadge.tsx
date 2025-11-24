import { Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FeatureLockBadgeProps {
  isLocked: boolean;
  requiredPlan?: string;
  currentLimit?: number;
  maxLimit?: number | null;
  feature?: string;
  inline?: boolean;
}

export const FeatureLockBadge = ({ 
  isLocked, 
  requiredPlan, 
  currentLimit,
  maxLimit,
  feature = "feature",
  inline = false 
}: FeatureLockBadgeProps) => {
  if (!isLocked) return null;

  const getMessage = () => {
    if (currentLimit !== undefined && maxLimit !== undefined && maxLimit !== null) {
      return `You've reached your plan limit (${currentLimit}/${maxLimit}). Upgrade to ${requiredPlan || "a higher plan"} for more.`;
    }
    return `This ${feature} is only available on ${requiredPlan || "higher plans"}. Upgrade to unlock.`;
  };

  if (inline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="ml-2 bg-muted/50 hover:bg-muted cursor-help">
              <Lock className="w-3 h-3 mr-1" />
              Locked
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{getMessage()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="secondary" className="bg-muted/90 backdrop-blur-sm hover:bg-muted cursor-help">
              <Lock className="w-3 h-3 mr-1" />
              Upgrade Required
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{getMessage()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const PremiumFeatureBadge = ({ planName }: { planName: string }) => {
  return (
    <Badge variant="secondary" className="bg-gradient-primary text-primary-foreground ml-2">
      <Sparkles className="w-3 h-3 mr-1" />
      {planName}
    </Badge>
  );
};
