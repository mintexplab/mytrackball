import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CreditCard, Check, Shield } from "lucide-react";
import { toast } from "@/lib/toast-with-sound";
import { supabase } from "@/integrations/supabase/client";

// Get the Stripe publishable key - you need to add VITE_STRIPE_PUBLISHABLE_KEY to your .env
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

const stripePromise = STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(STRIPE_PUBLISHABLE_KEY) 
  : null;

interface PaymentFormProps {
  clientSecret: string;
  releaseId: string;
  paymentIntentId: string;
  trackCount: number;
  releaseTitle: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm = ({ 
  releaseId, 
  paymentIntentId, 
  trackCount, 
  releaseTitle, 
  onSuccess, 
  onCancel 
}: Omit<PaymentFormProps, 'clientSecret'>) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const trackFee = 5 * trackCount;
  const upcFee = 8;
  const total = trackFee + upcFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/dashboard",
      },
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message || "Payment failed");
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Confirm the payment on our backend
      const { error: confirmError } = await supabase.functions.invoke(
        'confirm-release-payment',
        {
          body: { paymentIntentId, releaseId },
        }
      );

      if (confirmError) {
        toast.error("Payment succeeded but failed to update release. Please contact support.");
        setProcessing(false);
        return;
      }

      setSucceeded(true);
      toast.success("Payment successful! Your release is being processed.");
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }

    setProcessing(false);
  };

  if (succeeded) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-green-500 mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground">Your release is being processed for distribution.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Complete Payment
        </CardTitle>
        <CardDescription>
          Pay for "{releaseTitle}" distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 rounded-lg bg-muted/50">
          <h4 className="font-medium mb-3">Order Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Track fee ({trackCount} track{trackCount > 1 ? 's' : ''} × $5)
              </span>
              <span>${trackFee.toFixed(2)} CAD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">UPC fee</span>
              <span>${upcFee.toFixed(2)} CAD</span>
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)} CAD</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 rounded-lg border border-border bg-background">
            <PaymentElement 
              options={{
                layout: "tabs",
              }}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Payments are secure and encrypted by Stripe</span>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!stripe || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${total.toFixed(2)} CAD`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

interface ReleasePaymentFormProps {
  clientSecret: string;
  releaseId: string;
  paymentIntentId: string;
  trackCount: number;
  releaseTitle: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ReleasePaymentForm = ({
  clientSecret,
  releaseId,
  paymentIntentId,
  trackCount,
  releaseTitle,
  onSuccess,
  onCancel,
}: ReleasePaymentFormProps) => {
  if (!stripePromise) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-6">
          <p className="text-destructive text-center">
            Payment system is not configured. Please contact support.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#ef4444",
            colorBackground: "#0a0a0a",
            colorText: "#ffffff",
            colorDanger: "#ef4444",
            fontFamily: "Rubik, system-ui, sans-serif",
            borderRadius: "8px",
          },
        },
      }}
    >
      <CheckoutForm
        releaseId={releaseId}
        paymentIntentId={paymentIntentId}
        trackCount={trackCount}
        releaseTitle={releaseTitle}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
};
