import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

interface YourPlanBlockProps {
  userPlan: any;
}

export const YourPlanBlock = ({ userPlan }: YourPlanBlockProps) => {
  // Handle case where userPlan is null or plan is undefined
  if (!userPlan || !userPlan.plan) {
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
              <div>
                <Badge className="bg-gradient-primary text-white px-2 py-1 text-xs">
                  Trackball Free
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Basic distribution plan with essential features</p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

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
            <div>
              <Badge className="bg-gradient-primary text-white px-2 py-1 text-xs">
                {userPlan.plan.name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{userPlan.plan.description}</p>
            {userPlan.plan.name === "Trackball Partner" ? (
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
                  {userPlan.plan.features?.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                      <span className="flex-1">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
