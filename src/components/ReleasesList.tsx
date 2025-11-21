import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import ExportDDEX from "./ExportDDEX";
import ReleaseInfoDialog from "./ReleaseInfoDialog";
import ReleaseRejectionDialog from "./ReleaseRejectionDialog";

interface ReleasesListProps {
  userId?: string;
  isAdmin: boolean;
}

const ReleasesList = ({ userId, isAdmin }: ReleasesListProps) => {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReleases();
  }, [userId, isAdmin]);

  const fetchReleases = async () => {
    let query = supabase
      .from("releases")
      .select(`
        *,
        profiles!releases_user_id_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (!isAdmin && userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load releases");
      return;
    }

    setReleases(data || []);
    setLoading(false);
  };

  const updateReleaseStatus = async (releaseId: string, status: string) => {
    const { error } = await supabase
      .from("releases")
      .update({ status })
      .eq("id", releaseId);

    if (error) {
      toast.error("Failed to update release status");
      return;
    }

    toast.success(`Release ${status}`);
    fetchReleases();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; className: string }> = {
      pending: { icon: Clock, className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
      approved: { icon: CheckCircle2, className: "bg-green-500/20 text-green-300 border-green-500/30" },
      rejected: { icon: XCircle, className: "bg-red-500/20 text-red-300 border-red-500/30" },
      published: { icon: CheckCircle2, className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    };

    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;

    return (
      <Badge variant="outline" className={variant.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No releases yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Title</TableHead>
            <TableHead>Artist</TableHead>
            {isAdmin && <TableHead>User</TableHead>}
            <TableHead>Release Date</TableHead>
            <TableHead>Genre</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {releases.map((release) => (
            <TableRow key={release.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium">{release.title}</TableCell>
              <TableCell>{release.artist_name}</TableCell>
              {isAdmin && (
                <TableCell className="text-muted-foreground">
                  {release.profiles?.email || "Unknown"}
                </TableCell>
              )}
              <TableCell className="text-muted-foreground">
                {release.release_date ? new Date(release.release_date).toLocaleDateString() : "TBA"}
              </TableCell>
              <TableCell className="text-muted-foreground">{release.genre || "—"}</TableCell>
              <TableCell>{getStatusBadge(release.status)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <ReleaseInfoDialog releaseId={release.id} />
                  {isAdmin && (
                    <>
                      <ExportDDEX releaseId={release.id} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReleaseStatus(release.id, "approved")}
                        disabled={release.status === "approved"}
                        className="border-green-500/30 hover:bg-green-500/20 text-green-300"
                      >
                        Approve
                      </Button>
                      <ReleaseRejectionDialog
                        releaseId={release.id}
                        currentStatus={release.status}
                        onUpdate={fetchReleases}
                      />
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ReleasesList;
