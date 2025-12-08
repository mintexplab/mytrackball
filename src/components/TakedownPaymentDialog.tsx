import { useState } from "react";
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
import { AlertTriangle, CreditCard, ExternalLink, Loader2, Shield, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TakedownPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  releaseId: string;
  releaseTitle: string;
  artistName: string;
}

const TAKEDOWN_FEE = 19.85;

export const TakedownPaymentDialog = ({
  open,
  onOpenChange,
  releaseId,
  releaseTitle,
  artistName,
}: TakedownPaymentDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-takedown-checkout", {
        body: {
          releaseId,
          releaseTitle,
          artistName,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Checkout opened - complete payment to submit takedown request");
        onOpenChange(false);
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Takedown payment error:", error);
      toast.error(error.message || "Failed to create checkout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Payments are secure and encrypted by Stripe</span>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handlePayment}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Pay ${TAKEDOWN_FEE.toFixed(2)} CAD
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
