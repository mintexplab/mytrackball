import { useState, useMemo } from "react";
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

interface PaymentFormProps {
  description: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm = ({ description, amount, onSuccess, onCancel }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

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
      setSucceeded(true);
      toast.success("Payment successful!");
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted/50">
        <div className="flex justify-between font-semibold">
          <span>{description}</span>
          <span className="text-primary">${(amount / 100).toFixed(2)} CAD</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay ${(amount / 100).toFixed(2)} CAD
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

interface InDashboardPaymentProps {
  clientSecret: string;
  publishableKey: string;
  description: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export const InDashboardPayment = ({
  clientSecret,
  publishableKey,
  description,
  amount,
  onSuccess,
  onCancel,
}: InDashboardPaymentProps) => {
  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

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
        description={description}
        amount={amount}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
};
