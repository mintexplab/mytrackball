import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Trash2, AlertTriangle, CreditCard, Send, Loader2, DollarSign, Music, Ticket, ArrowLeft, ChevronDown, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReleaseInfoDialog from "./ReleaseInfoDialog";
import ReleaseRejectionDialog from "./ReleaseRejectionDialog";
import RequestInfoDialog from "./RequestInfoDialog";
import { TakedownPaymentDialog } from "./TakedownPaymentDialog";
import { InDashboardPayment } from "./InDashboardPayment";

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
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

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

  const handleSelectPricingTier = async (tier: "eco" | "standard") => {
    setPricingTier(tier);
    setPricingDialogOpen(false);
    setPaymentDialogOpen(true);
    setProcessingPayment(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-release-payment", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          releaseId: releaseForPayment?.id,
          releaseTitle: releaseForPayment?.title,
          trackCount,
          pricingTier: tier,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStripeClientSecret(data.clientSecret);
      setStripePublishableKey(data.publishableKey);
      setPaymentAmount(data.amount);
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast.error(error.message || "Failed to create payment session");
      setPaymentDialogOpen(false);
    } finally {
      setProcessingPayment(false);
    }
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

  const handlePaymentSuccess = async () => {
    if (!releaseForPayment) return;
    
    // Update release status after successful payment
    const { error } = await supabase
      .from("releases")
      .update({ status: "pending", payment_status: "paid" })
      .eq("id", releaseForPayment.id);

    if (error) {
      toast.error("Payment received but failed to update release status");
      return;
    }

    toast.success("Payment successful! Your release has been submitted for review.");
    setPaymentDialogOpen(false);
    setStripeClientSecret(null);
    setStripePublishableKey(null);
    fetchReleases();
  };

  const handlePaymentCancel = () => {
    setPaymentDialogOpen(false);
    setStripeClientSecret(null);
    setStripePublishableKey(null);
  };

  const handleBackToPricing = () => {
    setPaymentDialogOpen(false);
    setStripeClientSecret(null);
    setStripePublishableKey(null);
    setPricingDialogOpen(true);
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
      processing: { icon: Clock, className: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", label: "Awaiting Dispatch" },
      approved: { icon: CheckCircle2, className: "bg-green-500/20 text-green-300 border-green-500/30" },
      rejected: { icon: XCircle, className: "bg-red-500/20 text-red-300 border-red-500/30" },
      published: { icon: CheckCircle2, className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      "taken down": { icon: XCircle, className: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
      delivering: { icon: Clock, className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      delivered: { icon: Send, className: "bg-teal-500/20 text-teal-300 border-teal-500/30", label: "Delivered" },
      striked: { icon: AlertTriangle, className: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
      "on hold": { icon: AlertTriangle, className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
      "awaiting final qc": { icon: Clock, className: "bg-sky-500/20 text-sky-300 border-sky-500/30", label: "Awaiting QC" },
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

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      paid: { className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "Paid" },
      unpaid: { className: "bg-red-500/20 text-red-300 border-red-500/30", label: "Unpaid" },
      pending: { className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", label: "Pending" },
    };

    const variant = variants[paymentStatus] || variants.unpaid;

    return (
      <Badge variant="outline" className={variant.className}>
        <DollarSign className="w-3 h-3 mr-1" />
        {variant.label}
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
            {isAdmin && <TableHead>Payment</TableHead>}
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
              {isAdmin && <TableCell>{getPaymentStatusBadge(release.payment_status)}</TableCell>}
              <TableCell>
                <div className="flex gap-1 items-center justify-end">
                  {isAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="border-border">
                          Actions
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                        {/* Info */}
                        <ReleaseInfoDialog releaseId={release.id} asMenuItem />
                        
                        <DropdownMenuSeparator />
                        
                        {/* Quick Actions */}
                        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                        <DropdownMenuItem 
                          onClick={() => updateReleaseStatus(release.id, "approved")}
                          disabled={release.status === "approved"}
                          className="text-green-400"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-2" />
                          Approve
                        </DropdownMenuItem>
                        <ReleaseRejectionDialog
                          releaseId={release.id}
                          currentStatus={release.status}
                          onUpdate={fetchReleases}
                          asMenuItem
                        />
                        <RequestInfoDialog
                          releaseId={release.id}
                          releaseTitle={release.title}
                          artistName={release.artist_name}
                          userEmail={release.profiles?.email || ""}
                          userName={release.profiles?.full_name || release.profiles?.display_name || ""}
                          asMenuItem
                        />
                        
                        <DropdownMenuSeparator />
                        
                        {/* Status Options */}
                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => updateReleaseStatus(release.id, "pending")}>
                          <Clock className="w-3 h-3 mr-2 text-yellow-400" />
                          Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateReleaseStatus(release.id, "processing")}>
                          <Clock className="w-3 h-3 mr-2 text-cyan-400" />
                          Awaiting Dispatch
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateReleaseStatus(release.id, "delivering")}>
                          <Send className="w-3 h-3 mr-2 text-blue-400" />
                          Delivering
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateReleaseStatus(release.id, "delivered")}>
                          <CheckCircle2 className="w-3 h-3 mr-2 text-teal-400" />
                          Delivered
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateReleaseStatus(release.id, "awaiting final qc")}>
                          <Clock className="w-3 h-3 mr-2 text-sky-400" />
                          Awaiting Final QC
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateReleaseStatus(release.id, "on hold")}>
                          <AlertTriangle className="w-3 h-3 mr-2 text-purple-400" />
                          On Hold
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateReleaseStatus(release.id, "striked")}>
                          <AlertTriangle className="w-3 h-3 mr-2 text-orange-400" />
                          Striked
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateReleaseStatus(release.id, "taken down")}>
                          <XCircle className="w-3 h-3 mr-2 text-gray-400" />
                          Taken Down
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {/* Payment Options */}
                        <DropdownMenuLabel>Payment Status</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => updateReleaseStatus(release.id, "paid")}>
                          <CheckCircle2 className="w-3 h-3 mr-2 text-emerald-400" />
                          Mark Paid
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateReleaseStatus(release.id, "pay_later")}>
                          <Clock className="w-3 h-3 mr-2 text-amber-400" />
                          Pay Later
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {/* Danger Zone */}
                        <DropdownMenuItem 
                          onClick={() => deleteRelease(release.id)}
                          className="text-red-400"
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete Release
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      {/* Pay and Distribute Dialog with Embedded Stripe */}
      <Dialog open={paymentDialogOpen} onOpenChange={handlePaymentCancel}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBackToPricing}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  Pay and Distribute
                </DialogTitle>
                <DialogDescription>
                  {PRICING[pricingTier].name} - {releaseForPayment?.title}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            {processingPayment ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : stripeClientSecret && stripePublishableKey ? (
              <InDashboardPayment
                clientSecret={stripeClientSecret}
                publishableKey={stripePublishableKey}
                description={`${releaseForPayment?.title} (${trackCount} track${trackCount > 1 ? 's' : ''})`}
                amount={paymentAmount}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load payment form. Please try again.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReleasesList;
