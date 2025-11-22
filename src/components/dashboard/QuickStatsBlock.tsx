import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface QuickStatsBlockProps {
  userId?: string;
}

export const QuickStatsBlock = ({ userId }: QuickStatsBlockProps) => {
  const [releases, setReleases] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchReleases = async () => {
      if (!userId) return;
      
      const { data } = await supabase
        .from("releases")
        .select("*")
        .eq("user_id", userId);
      
      setReleases(data || []);
    };
    
    fetchReleases();
  }, [userId]);
  
  const delivered = releases.filter(r => r.status === "delivering").length;
  const approved = releases.filter(r => r.status === "approved").length;
  const drafts = releases.filter(r => !r.status || r.status === "rejected").length;
  const processing = releases.filter(r => r.status === "pending").length;
  
  return (
    <Collapsible defaultOpen>
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 sm:pb-6 cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-base sm:text-xl font-bold text-left">Quick Stats</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-left">Your distribution overview</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground text-left">Delivered</p>
                <p className="text-xl font-bold text-foreground text-left">{delivered}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground text-left">Approved</p>
                <p className="text-xl font-bold text-foreground text-left">{approved}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground text-left">Drafts</p>
                <p className="text-xl font-bold text-foreground text-left">{drafts}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground text-left">Processing</p>
                <p className="text-xl font-bold text-foreground text-left">{processing}</p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
