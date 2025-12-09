import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Trash2, AlertTriangle, CreditCard, Send, Loader2, DollarSign, Music, Ticket } from "lucide-react";
import ReleaseInfoDialog from "./ReleaseInfoDialog";
import ReleaseRejectionDialog from "./ReleaseRejectionDialog";
import { TakedownPaymentDialog } from "./TakedownPaymentDialog";

// Pricing tiers
const PRICING = {
  eco: { trackFee: 1, upcFee: 4, name: "Trackball Eco" },
  standard: { trackFee: 5, upcFee: 8, name: "Trackball Standard" },
};

interface TrackAllowance {
  hasSubscription: boolean;
  tracksAllowed: number;
  tracksUsed: number;
  tracksRemaining: number;
}

interface ReleasesListProps {
  userId?: string;
  isAdmin: boolean;
}

const ReleasesList = ({ userId, isAdmin }: ReleasesListProps) => {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [takedownDialogOpen, setTakedownDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<{ id: string; title: string; artistName: string } | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [releaseForPayment, setReleaseForPayment] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [trackCount, setTrackCount] = useState(1);
  const [pricingTier, setPricingTier] = useState<"eco" | "standard">("standard");
  const [trackAllowance, setTrackAllowance] = useState<TrackAllowance | null>(null);
  const [loadingAllowance, setLoadingAllowance] = useState(false);
  const [usingAllowance, setUsingAllowance] = useState(false);

  // Fetch track allowance when pricing dialog opens
  useEffect(() => {
    if (pricingDialogOpen && !isAdmin) {
      fetchTrackAllowance();
    }
  }, [pricingDialogOpen]);

  const fetchTrackAllowance = async () => {
    setLoadingAllowance(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-track-allowance');
      if (!error && data) {
        setTrackAllowance(data);
      }
    } catch (error) {
      console.error('Failed to fetch track allowance:', error);
    } finally {
      setLoadingAllowance(false);
    }
  };

  const canUseAllowance = trackAllowance?.hasSubscription && 
    trackAllowance.tracksRemaining >= trackCount;

  useEffect(() => {
    fetchReleases();
    // Check for payment success from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const paymentResult = urlParams.get("payment");
    const releaseId = urlParams.get("releaseId");
    
    if (paymentResult === "success" && releaseId) {
      // Update release status after successful payment
      processPaymentSuccess(releaseId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check for takedown success
    const takedownResult = urlParams.get("takedown");
    if (takedownResult === "success" && releaseId) {
      processTakedownAfterPayment(releaseId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [userId, isAdmin]);

  const processPaymentSuccess = async (releaseId: string) => {
    const { error } = await supabase
      .from("releases")
      .update({ status: "pending" })
      .eq("id", releaseId);

    if (error) {
      toast.error("Payment received but failed to update release status. Please contact support.");
      return;
    }

    toast.success("Payment successful! Your release has been submitted for review.");
    fetchReleases();
  };

  const processTakedownAfterPayment = async (releaseId: string) => {
    const { error } = await supabase
      .from("releases")
      .update({ takedown_requested: true })
      .eq("id", releaseId);

    if (error) {
      toast.error("Payment received but failed to submit takedown request. Please contact support.");
      return;
    }

    toast.success("Payment successful! Takedown request submitted to admin.");
    fetchReleases();
  };

  const fetchReleases = async () => {
    let query = supabase
      .from("releases")
      .select(`
        *,
        profiles!releases_user_id_fkey(full_name, email)
      `)
      .is("archived_at", null)
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

  const fetchTrackCount = async (releaseId: string) => {
    const { data, error } = await supabase
      .from("tracks")
      .select("id")
      .eq("release_id", releaseId);

    if (!error && data) {
      return data.length || 1;
    }
    return 1;
  };

  const openPaymentDialog = async (release: any) => {
    const count = await fetchTrackCount(release.id);
    setTrackCount(count);
    setReleaseForPayment(release);
    setPricingDialogOpen(true); // Show pricing options first
  };

  const handleSelectPricingTier = (tier: "eco" | "standard") => {
    setPricingTier(tier);
    setPricingDialogOpen(false);
    setPaymentDialogOpen(true);
  };

  const handleUseTrackAllowance = async () => {
    if (!releaseForPayment) return;
    setUsingAllowance(true);
    try {
      // Update release to pending and consume allowance
      await supabase.from("releases").update({ status: "pending", payment_status: "paid" }).eq("id", releaseForPayment.id);
      await supabase.functions.invoke('consume-track-allowance', {
        body: { trackCount, releaseId: releaseForPayment.id, releaseTitle: releaseForPayment.title }
      });
      toast.success("Release submitted using track allowance!");
      setPricingDialogOpen(false);
      fetchReleases();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit release");
    } finally {
      setUsingAllowance(false);
    }
  };

  const handlePayAndDistribute = async () => {
    if (!releaseForPayment) return;

    setProcessingPayment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-release-checkout", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          releaseId: releaseForPayment.id,
          trackCount,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error(error.message || "Failed to create checkout session");
    } finally {
      setProcessingPayment(false);
      setPaymentDialogOpen(false);
    }
  };

  const updateReleaseStatus = async (releaseId: string, status: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const { data, error } = await supabase.functions.invoke("update-release-status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          releaseId,
          status,
        },
      });

      if (error) {
        toast.error("Failed to update release status: " + error.message);
        console.error("Update error:", error);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Release status updated to ${status}`);
      fetchReleases();
    } catch (error: any) {
      toast.error("Failed to update release status: " + error.message);
      console.error("Update error:", error);
    }
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

  const openTakedownDialog = (release: any) => {
    setSelectedRelease({
      id: release.id,
      title: release.title,
      artistName: release.artist_name,
    });
    setTakedownDialogOpen(true);
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

  // Calculate payment amounts
  const trackFee = 5;
  const upcFee = 8;
  const totalAmount = (trackCount * trackFee) + upcFee;

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
                      {/* Pay and Distribute button for pending_payment status */}
                      {release.status === "pending_payment" && (
                        <Button
                          size="sm"
                          onClick={() => openPaymentDialog(release)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <DollarSign className="w-3 h-3 mr-1" />
                          Pay and Distribute
                        </Button>
                      )}
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
                          onClick={() => openTakedownDialog(release)}
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

      {selectedRelease && (
        <TakedownPaymentDialog
          open={takedownDialogOpen}
          onOpenChange={setTakedownDialogOpen}
          releaseId={selectedRelease.id}
          releaseTitle={selectedRelease.title}
          artistName={selectedRelease.artistName}
        />
      )}

      {/* Pricing Selection Dialog */}
      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Select Distribution Plan</DialogTitle>
            <DialogDescription>
              Choose how to pay for "{releaseForPayment?.title}" ({trackCount} track{trackCount > 1 ? 's' : ''})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Track Allowance Option */}
            {canUseAllowance && (
              <div 
                className="p-4 rounded-lg border-2 border-cyan-500/50 hover:border-cyan-500 cursor-pointer bg-card"
                onClick={handleUseTrackAllowance}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-6 h-6 text-cyan-500" />
                    <div>
                      <p className="font-bold">Use Track Allowance</p>
                      <p className="text-sm text-muted-foreground">{trackAllowance?.tracksRemaining} slots remaining</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-cyan-500">FREE</span>
                </div>
              </div>
            )}
            {/* Eco */}
            <div 
              className="p-4 rounded-lg border border-border hover:border-green-500/50 cursor-pointer"
              onClick={() => handleSelectPricingTier("eco")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">Trackball Eco</p>
                  <p className="text-sm text-muted-foreground">$1/track + $4 UPC</p>
                </div>
                <span className="text-xl font-bold text-green-500">${trackCount * 1 + 4} CAD</span>
              </div>
            </div>
            {/* Standard */}
            <div 
              className="p-4 rounded-lg border-2 border-primary/50 hover:border-primary cursor-pointer"
              onClick={() => handleSelectPricingTier("standard")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">Trackball Standard</p>
                  <p className="text-sm text-muted-foreground">$5/track + $8 UPC</p>
                </div>
                <span className="text-xl font-bold text-primary">${trackCount * 5 + 8} CAD</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay and Distribute Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Pay and Distribute
            </DialogTitle>
            <DialogDescription>
              Complete payment to submit "{releaseForPayment?.title}" for distribution
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Track fees ({trackCount} × $5 CAD)</span>
                <span className="font-medium">${trackCount * trackFee}.00 CAD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UPC fee</span>
                <span className="font-medium">${upcFee}.00 CAD</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-lg">
                <span className="font-medium">Total</span>
                <span className="font-bold text-primary">${totalAmount}.00 CAD</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handlePayAndDistribute}
                disabled={processingPayment}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay ${totalAmount}.00 CAD
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReleasesList;
