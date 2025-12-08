import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Shield, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSavedPaymentMethod } from "@/hooks/useSavedPaymentMethod";
import { SavedPaymentConfirmDialog } from "./SavedPaymentConfirmDialog";
import { InDashboardPayment } from "./InDashboardPayment";

interface TakedownPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  releaseId: string;
  releaseTitle: string;
  artistName: string;
  onSuccess?: () => void;
}

const TAKEDOWN_FEE = 19.85;

export const TakedownPaymentDialog = ({
  open,
  onOpenChange,
  releaseId,
  releaseTitle,
  artistName,
  onSuccess,
}: TakedownPaymentDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSavedPaymentDialog, setShowSavedPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    clientSecret: string;
    publishableKey: string;
    paymentIntentId: string;
  } | null>(null);
  const { paymentMethod, loading: loadingPaymentMethod, hasPaymentMethod } = useSavedPaymentMethod();

  // Initialize payment when dialog opens
  useEffect(() => {
    if (open && !paymentData && !isLoading) {
      // Check for saved payment method first
      if (hasPaymentMethod && !loadingPaymentMethod) {
        setShowSavedPaymentDialog(true);
        onOpenChange(false);
      } else if (!loadingPaymentMethod) {
        initializePayment();
      }
    }
  }, [open, hasPaymentMethod, loadingPaymentMethod]);

  const initializePayment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-takedown-payment", {
        body: { releaseId, releaseTitle, artistName }
      });

      if (error) throw error;
      setPaymentData(data);
    } catch (error: any) {
      console.error("Takedown payment error:", error);
      toast.error(error.message || "Failed to initialize payment");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // Update release status to takedown_requested
    try {
      await supabase
        .from("releases")
        .update({ takedown_requested: true, status: "takedown_requested" })
        .eq("id", releaseId);

      toast.success("Takedown request submitted successfully!");
      onSuccess?.();
      onOpenChange(false);
      setPaymentData(null);
    } catch (error) {
      console.error("Error updating release status:", error);
      toast.error("Payment successful but failed to update release status");
    }
  };

  const handleSavedPaymentSuccess = () => {
    toast.success("Takedown request submitted successfully!");
    onSuccess?.();
  };

  const handleUseDifferentCard = () => {
    setShowSavedPaymentDialog(false);
    onOpenChange(true);
    initializePayment();
  };

  // If we have a saved payment method, show the quick payment dialog instead
  if (showSavedPaymentDialog && paymentMethod) {
    return (
      <SavedPaymentConfirmDialog
        open={showSavedPaymentDialog}
        onOpenChange={setShowSavedPaymentDialog}
        paymentMethod={paymentMethod}
        amount={TAKEDOWN_FEE}
        description={`Takedown fee for "${releaseTitle}"`}
        releaseId={releaseId}
        releaseTitle={releaseTitle}
        type="takedown"
        onSuccess={handleSavedPaymentSuccess}
        onUseDifferentCard={handleUseDifferentCard}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) setPaymentData(null);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Request Takedown
          </DialogTitle>
          <DialogDescription>
            Remove "{releaseTitle}" from streaming platforms
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-500/30 bg-amber-500/10">
            <Info className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-200 text-sm">
              Our distribution partner charges a 10 EUR fee for takedowns, and as such, we are required to charge this fee.
            </AlertDescription>
          </Alert>

          <Card className="border-border/50 bg-muted/30">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Release</span>
                  <span className="font-medium truncate max-w-[200px]">{releaseTitle}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Artist</span>
                  <span>{artistName}</span>
                </div>
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex justify-between font-semibold">
                    <span>Takedown Fee</span>
                    <span className="text-primary">${TAKEDOWN_FEE.toFixed(2)} CAD</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading || loadingPaymentMethod ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading payment...</span>
            </div>
          ) : paymentData ? (
            <InDashboardPayment
              clientSecret={paymentData.clientSecret}
              publishableKey={paymentData.publishableKey}
              description="Takedown Fee"
              amount={1985}
              onSuccess={handlePaymentSuccess}
              onCancel={() => onOpenChange(false)}
            />
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Payments are secure and encrypted by Stripe</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
