import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CreditCard, Loader2, XCircle } from "lucide-react";
import { PaymentMethodSetup } from "./PaymentMethodSetup";
import { useSavedPaymentMethod } from "@/hooks/useSavedPaymentMethod";
import { usePreferredCurrency } from "@/hooks/usePreferredCurrency";
import { convertCurrency, formatCurrency } from "./CurrencySelector";

interface Fine {
  id: string;
  amount: number;
  reason: string;
  fine_type: string;
  strike_number: number;
  created_at: string;
  notes: string | null;
}

interface FineDialogProps {
  userId: string;
  onResolved: () => void;
}

export const FineDialog = ({ userId, onResolved }: FineDialogProps) => {
  const [pendingFines, setPendingFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);
  const { paymentMethod, loading: paymentLoading, refetch: refetchPayment } = useSavedPaymentMethod();
  const { currency } = usePreferredCurrency();

  useEffect(() => {
    fetchPendingFines();
  }, [userId]);

  const fetchPendingFines = async () => {
    const { data, error } = await supabase
      .from("user_fines")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching fines:", error);
    }
    setPendingFines((data as Fine[]) || []);
    setLoading(false);
  };

  const totalAmount = pendingFines.reduce((sum, fine) => sum + Number(fine.amount), 0);
  const latestFine = pendingFines[pendingFines.length - 1];
  const strikeNumber = latestFine?.strike_number || 0;
  const isMockFine = latestFine?.notes?.includes("[MOCK FINE]") || false;

  const handleAuthorizeFine = async () => {
    // For mock fines, skip payment method requirement
    if (!isMockFine && !paymentMethod) {
      setShowPaymentSetup(true);
      return;
    }

    setProcessing(true);
    try {
      // Only charge if not a mock fine
      if (!isMockFine) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        // Charge the saved payment method
        const { data, error } = await supabase.functions.invoke("charge-saved-payment", {
          body: {
            paymentMethodId: paymentMethod!.id,
            amount: Math.round(totalAmount * 100), // Convert to cents
            description: `Fine payment - ${pendingFines.map(f => f.fine_type).join(", ")}`,
            type: "fine",
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      // Mark all pending fines as paid
      const fineIds = pendingFines.map(f => f.id);
      const { error: updateError } = await supabase
        .from("user_fines")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .in("id", fineIds);

      if (updateError) throw updateError;

      // Clear local state immediately to prevent dialog from showing again
      setPendingFines([]);
      
      toast.success(isMockFine ? "Mock fine acknowledged" : "Fine paid successfully");
      onResolved();
    } catch (error: any) {
      console.error("Error paying fine:", error);
      toast.error(error.message || "Failed to process payment");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelFine = async () => {
    if (!confirm("Are you sure you want to cancel? Your account will be locked for 1 week.")) {
      return;
    }

    setProcessing(true);
    try {
      // Mark all pending fines as cancelled
      for (const fine of pendingFines) {
        await supabase
          .from("user_fines")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          })
          .eq("id", fine.id);
      }

      // Lock the account for 1 week
      await supabase
        .from("profiles")
        .update({ is_locked: true })
        .eq("id", userId);

      toast.warning("Your account has been locked for 1 week due to unpaid fine");
      onResolved();
    } catch (error: any) {
      console.error("Error cancelling fine:", error);
      toast.error(error.message || "Failed to process cancellation");
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSetupComplete = () => {
    setShowPaymentSetup(false);
    refetchPayment();
  };

  if (loading || paymentLoading) {
    return null;
  }

  if (pendingFines.length === 0) {
    return null;
  }

  // For mock fines, skip payment method requirement - go directly to main dialog
  if (isMockFine) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="bg-card border-yellow-500/50 max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-yellow-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Mock Fine Issued
            </DialogTitle>
            <DialogDescription>
              This is a mock fine for testing purposes. No payment is required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-foreground mb-3">
                <strong>Reason:</strong> {latestFine?.reason}
              </p>
              
              <div className="text-sm text-muted-foreground mb-2">
                Mock fine amount
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl font-bold text-yellow-500">
                    {formatCurrency(convertCurrency(totalAmount, currency), currency)}
                  </span>
                  {currency !== "CAD" && (
                    <p className="text-xs text-muted-foreground">≈ ${totalAmount.toFixed(2)} CAD</p>
                  )}
                </div>
                <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                  Strike {strikeNumber} of 3
                </Badge>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                ⚠️ This is a <strong>mock fine</strong> for testing. Click "Acknowledge" to dismiss without payment.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAuthorizeFine}
                disabled={processing}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Acknowledge Mock Fine"
                )}
              </Button>
              <Button
                onClick={handleCancelFine}
                disabled={processing}
                variant="outline"
                className="flex-1"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If no payment method and not showing setup
  if (!paymentMethod && !showPaymentSetup) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="bg-card border-destructive/50 max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              A Fine Has Been Issued
            </DialogTitle>
            <DialogDescription>
              You must add a payment method before you can proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-foreground mb-2">
                <strong>Reason:</strong> {latestFine?.reason}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold text-destructive">
                    {formatCurrency(convertCurrency(totalAmount, currency), currency)}
                  </span>
                  {currency !== "CAD" && (
                    <p className="text-xs text-muted-foreground">≈ ${totalAmount.toFixed(2)} CAD</p>
                  )}
                </div>
                <Badge variant="destructive">
                  Strike {strikeNumber} of 3
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              You need to add a payment method to authorize or cancel this fine.
            </p>

            <Button
              onClick={() => setShowPaymentSetup(true)}
              className="w-full bg-gradient-primary"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show payment setup
  if (showPaymentSetup) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="bg-card border-border max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Add Payment Method
            </DialogTitle>
            <DialogDescription>
              Add a payment method to proceed with fine authorization.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <PaymentMethodSetup 
              onComplete={handlePaymentSetupComplete}
              onSkip={() => {}}
              hideSkip={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="bg-card border-destructive/50 max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            A Fine Has Been Issued
          </DialogTitle>
          <DialogDescription>
            A fine has been issued on your account for the following reason:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-foreground mb-3">
              <strong>Reason:</strong> {latestFine?.reason}
            </p>
            
            <div className="text-sm text-muted-foreground mb-2">
              A fine of
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-bold text-destructive">
                  {formatCurrency(convertCurrency(totalAmount, currency), currency)}
                </span>
                {currency !== "CAD" && (
                  <p className="text-xs text-muted-foreground">≈ ${totalAmount.toFixed(2)} CAD</p>
                )}
              </div>
              <Badge variant="destructive">
                Strike {strikeNumber} of 3
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mt-3">
              will be deducted from your saved payment method upon clicking the "Authorize Fine" button.
            </p>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4" />
              <span>
                {paymentMethod?.brand?.charAt(0).toUpperCase()}{paymentMethod?.brand?.slice(1)} •••• {paymentMethod?.last4}
              </span>
            </div>
          </div>

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-500">
              ⚠️ If you click Cancel, your account will receive a 1-week lock. You are now on strike {strikeNumber} of 3.
            </p>
          </div>

          {strikeNumber >= 3 && (
            <div className="p-3 bg-destructive/20 border border-destructive/50 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                🚨 This is your 3rd strike. Your account will be suspended and a $55 CAD penalty fee will be added.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleAuthorizeFine}
              disabled={processing}
              className="flex-1 bg-gradient-primary"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Authorize Fine
                </>
              )}
            </Button>
            <Button
              onClick={handleCancelFine}
              disabled={processing}
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
