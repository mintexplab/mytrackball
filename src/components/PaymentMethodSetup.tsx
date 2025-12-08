import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Loader2, Check, SkipForward } from "lucide-react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

interface PaymentMethodSetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

const CardSetupForm = ({ onComplete, onSkip }: PaymentMethodSetupProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setupIntent = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("setup-payment-method");
        if (error) throw error;
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        }
      } catch (err: any) {
        console.error("Failed to create setup intent:", err);
        setError("Failed to initialize payment setup");
      }
    };
    setupIntent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setIsLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (setupIntent?.status === "succeeded") {
        toast.success("Payment method saved successfully!");
        onComplete();
      }
    } catch (err: any) {
      console.error("Card setup error:", err);
      setError(err.message || "Failed to save payment method");
      toast.error(err.message || "Failed to save payment method");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Card Details</label>
        <div className="p-3 border border-border rounded-lg bg-background/50">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#ffffff",
                  "::placeholder": {
                    color: "#6b7280",
                  },
                },
                invalid: {
                  color: "#ef4444",
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onSkip}
          disabled={isLoading}
        >
          <SkipForward className="w-4 h-4 mr-2" />
          Skip for Now
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!stripe || !clientSecret || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Card
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export const PaymentMethodSetup = ({ onComplete, onSkip }: PaymentMethodSetupProps) => {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initStripe = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("setup-payment-method");
        if (error) throw error;
        if (data?.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      } catch (err) {
        console.error("Failed to init Stripe:", err);
      } finally {
        setLoading(false);
      }
    };
    initStripe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Unable to load payment setup. You can add a payment method later.
        </p>
        <Button onClick={onSkip} variant="outline" className="w-full">
          Continue
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-border/50 bg-muted/20">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Save Payment Method</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Save your card for faster checkouts on future releases and takedowns. 
          You won't be charged now.
        </p>
        <Elements stripe={stripePromise}>
          <CardSetupForm onComplete={onComplete} onSkip={onSkip} />
        </Elements>
      </CardContent>
    </Card>
  );
};
