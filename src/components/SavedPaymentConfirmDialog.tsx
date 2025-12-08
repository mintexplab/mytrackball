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
import { CreditCard, Loader2, Shield, Check } from "lucide-react";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface SavedPaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod: PaymentMethod;
  amount: number;
  description: string;
  releaseId?: string;
  releaseTitle?: string;
  type: 'release' | 'takedown';
  onSuccess: () => void;
  onUseDifferentCard: () => void;
}

const getCardBrandDisplay = (brand: string) => {
  const brands: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return brands[brand?.toLowerCase()] || brand || "Card";
};

export const SavedPaymentConfirmDialog = ({
  open,
  onOpenChange,
  paymentMethod,
  amount,
  description,
  releaseId,
  releaseTitle,
  type,
  onSuccess,
  onUseDifferentCard,
}: SavedPaymentConfirmDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayNow = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("charge-saved-payment", {
        body: {
          paymentMethodId: paymentMethod.id,
          amount,
          description,
          releaseId,
          type,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Payment successful!");
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data?.error || "Payment failed");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Payment failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Quick Payment
          </DialogTitle>
          <DialogDescription>
            We have your payment method on file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Would you like to pay the {type === 'release' ? 'release' : 'takedown'} fee of
                </p>
                <p className="text-2xl font-bold text-primary">
                  ${amount.toFixed(2)} CAD
                </p>
                {releaseTitle && (
                  <p className="text-sm text-muted-foreground">
                    for release "<span className="font-medium text-foreground">{releaseTitle}</span>"
                  </p>
                )}
                <div className="pt-2 border-t border-border mt-3">
                  <p className="text-sm">
                    using <span className="font-semibold">{getCardBrandDisplay(paymentMethod.brand)}</span> ****{paymentMethod.last4}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires {paymentMethod.exp_month}/{paymentMethod.exp_year}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Payments are secure and encrypted by Stripe</span>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={handlePayNow}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Pay ${amount.toFixed(2)} CAD Now
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onUseDifferentCard();
              }}
              disabled={isLoading}
            >
              Use Different Card
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
