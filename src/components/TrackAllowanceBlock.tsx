import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Music, Loader2 } from "lucide-react";

interface TrackAllowanceData {
  hasSubscription: boolean;
  tracksAllowed: number;
  tracksUsed: number;
  tracksRemaining: number;
  monthlyAmount: number;
}

export const TrackAllowanceBlock = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrackAllowanceData | null>(null);

  useEffect(() => {
    const fetchAllowance = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: result, error } = await supabase.functions.invoke("check-track-allowance", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!error && result) {
          setData(result);
        }
      } catch (error) {
        console.error("Error fetching track allowance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllowance();
  }, []);

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.hasSubscription) {
    return null; // Don't show if no subscription
  }

  const usagePercentage = data.tracksAllowed > 0 
    ? (data.tracksUsed / data.tracksAllowed) * 100 
    : 0;

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Track Allowance
          <Badge variant="outline" className="ml-auto text-xs">
            {data.tracksRemaining} left
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">This Month</span>
          <span className="font-medium">{data.tracksUsed} / {data.tracksAllowed} tracks</span>
        </div>
        
        <Progress value={usagePercentage} className="h-2" />
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Music className="w-3 h-3" />
          <span>{data.tracksRemaining} tracks remaining</span>
        </div>
      </CardContent>
    </Card>
  );
};
