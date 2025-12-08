import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Trash2, AlertTriangle, CreditCard, Send } from "lucide-react";
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
      .is("archived_at", null)  // Only show active (non-archived) releases
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
    const { data: release, error: fetchError } = await supabase
      .from("releases")
      .select(`
        *,
        profiles!releases_user_id_fkey(email)
      `)
      .eq("id", releaseId)
      .maybeSingle();

    if (fetchError) {
      toast.error("Failed to fetch release");
      console.error("Fetch error:", fetchError);
      return;
    }

    if (!release) {
      toast.error("Release not found");
      return;
    }

    const { error } = await supabase
      .from("releases")
      .update({ status })
      .eq("id", releaseId);

    if (error) {
      toast.error("Failed to update release status");
      console.error("Update error:", error);
      return;
    }

    // Send email notification
    if (release.profiles?.email) {
      await supabase.functions.invoke("send-release-status-email", {
        body: {
          userEmail: release.profiles.email,
          releaseTitle: release.title,
          artistName: release.artist_name,
          status: status,
          rejectionReason: release.rejection_reason,
        },
      });
    }

    toast.success(`Release status updated to ${status}`);
    fetchReleases();
  };

  const deleteRelease = async (releaseId: string) => {
    if (!confirm("Are you sure you want to delete this release? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from("releases")
      .delete()
      .eq("id", releaseId);

    if (error) {
      toast.error("Failed to delete release");
      return;
    }

    toast.success("Release deleted successfully");
    fetchReleases();
  };

  const requestTakedown = async (releaseId: string) => {
    const { error } = await supabase
      .from("releases")
      .update({ takedown_requested: true })
      .eq("id", releaseId);

    if (error) {
      toast.error("Failed to request takedown");
      return;
    }

    toast.success("Takedown request submitted");
    fetchReleases();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; className: string; label?: string }> = {
      pending: { icon: Clock, className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
      pending_payment: { icon: CreditCard, className: "bg-orange-500/20 text-orange-300 border-orange-500/30", label: "Payment pending" },
      pay_later: { icon: Clock, className: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "Pay later" },
      paid: { icon: CheckCircle2, className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "Paid" },
      processing: { icon: Clock, className: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", label: "Processing" },
      approved: { icon: CheckCircle2, className: "bg-green-500/20 text-green-300 border-green-500/30" },
      rejected: { icon: XCircle, className: "bg-red-500/20 text-red-300 border-red-500/30" },
      published: { icon: CheckCircle2, className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      "taken down": { icon: XCircle, className: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
      delivering: { icon: Clock, className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      delivered: { icon: Send, className: "bg-teal-500/20 text-teal-300 border-teal-500/30", label: "Delivered" },
      striked: { icon: AlertTriangle, className: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
      "on hold": { icon: AlertTriangle, className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
    };

    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    const displayLabel = variant.label || status;

    return (
      <Badge variant="outline" className={variant.className}>
        <Icon className="w-3 h-3 mr-1" />
        {displayLabel}
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
            <TableHead>Catalog #</TableHead>
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
              <TableCell className="text-muted-foreground">{release.catalog_number || "—"}</TableCell>
              <TableCell>{getStatusBadge(release.status)}</TableCell>
              <TableCell>
                <div className="flex gap-2 flex-wrap">
                  <ReleaseInfoDialog releaseId={release.id} />
                  {isAdmin ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReleaseStatus(release.id, "paid")}
                        className="border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300"
                      >
                        Paid
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReleaseStatus(release.id, "processing")}
                        className="border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300"
                      >
                        Processing
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReleaseStatus(release.id, "pay_later")}
                        className="border-amber-500/30 hover:bg-amber-500/20 text-amber-300"
                      >
                        Pay Later
                      </Button>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReleaseStatus(release.id, "delivering")}
                        className="border-blue-500/30 hover:bg-blue-500/20 text-blue-300"
                      >
                        Delivering
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReleaseStatus(release.id, "delivered")}
                        className="border-teal-500/30 hover:bg-teal-500/20 text-teal-300"
                      >
                        Delivered
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReleaseStatus(release.id, "taken down")}
                        className="border-gray-500/30 hover:bg-gray-500/20 text-gray-300"
                      >
                        Taken Down
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReleaseStatus(release.id, "striked")}
                        className="border-orange-500/30 hover:bg-orange-500/20 text-orange-300"
                      >
                        Striked
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReleaseStatus(release.id, "on hold")}
                        className="border-purple-500/30 hover:bg-purple-500/20 text-purple-300"
                      >
                        On Hold
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReleaseStatus(release.id, "awaiting final qc")}
                        className="border-sky-500/30 hover:bg-sky-500/20 text-sky-300"
                      >
                        Awaiting Final QC
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteRelease(release.id)}
                        className="border-red-500/30 hover:bg-red-500/20 text-red-300"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                       {release.status === "approved" && !release.takedown_requested && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => requestTakedown(release.id)}
                          className="border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-300"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Request Takedown
                        </Button>
                      )}
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
