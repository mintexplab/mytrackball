import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { toast } from "sonner";

interface DistributionLog {
  id: string;
  release_id: string;
  status: string;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
    email: string;
  } | null;
}

interface DistributionHistoryProps {
  releaseId: string;
}

export const DistributionHistory = ({ releaseId }: DistributionHistoryProps) => {
  const [logs, setLogs] = useState<DistributionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [releaseId]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("distribution_logs")
      .select(`
        *,
        profiles:changed_by (
          display_name,
          email
        )
      `)
      .eq("release_id", releaseId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load distribution history");
      console.error(error);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      approved: "bg-green-500/20 text-green-300 border-green-500/30",
      rejected: "bg-red-500/20 text-red-300 border-red-500/30",
      "taken down": "bg-gray-500/20 text-gray-300 border-gray-500/30",
      delivering: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      striked: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      "on hold": "bg-purple-500/20 text-purple-300 border-purple-500/30",
    };

    return (
      <Badge className={`${variants[status] || "bg-muted"} border`}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Distribution History</CardTitle>
          <CardDescription>Loading history...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Distribution History</CardTitle>
          <CardDescription>No history available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Distribution History</CardTitle>
        <CardDescription>Audit trail of status changes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(log.status)}
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                {log.notes && (
                  <p className="text-sm text-muted-foreground">{log.notes}</p>
                )}
                {log.profiles && (
                  <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Changed by: {log.profiles.display_name || log.profiles.email}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
