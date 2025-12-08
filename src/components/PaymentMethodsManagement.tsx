import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, Loader2, Shield, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
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

const AddCardForm = ({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) => {
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
        toast.success("Card added successfully!");
        onComplete();
      }
    } catch (err: any) {
      console.error("Card setup error:", err);
      setError(err.message || "Failed to add card");
      toast.error(err.message || "Failed to add card");
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

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !clientSecret || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Add Card
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export const PaymentMethodsManagement = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-billing-details");
      if (error) throw error;
      setPaymentMethods(data?.paymentMethods || []);
    } catch (err) {
      console.error("Failed to fetch payment methods:", err);
    } finally {
      setLoading(false);
    }
  };

  const initStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("setup-payment-method");
      if (error) throw error;
      if (data?.publishableKey) {
        setStripePromise(loadStripe(data.publishableKey));
      }
    } catch (err) {
      console.error("Failed to init Stripe:", err);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
    initStripe();
  }, []);

  const handleDeleteCard = async (paymentMethodId: string) => {
    if (!window.confirm("Are you sure you want to remove this card?")) return;

    setDeleting(paymentMethodId);
    try {
      const { data, error } = await supabase.functions.invoke("detach-payment-method", {
        body: { paymentMethodId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Payment method removed successfully");
      fetchPaymentMethods();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove card");
    } finally {
      setDeleting(null);
    }
  };

  const handleAddCardComplete = () => {
    setShowAddCard(false);
    fetchPaymentMethods();
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Payment Methods
        </CardTitle>
        <CardDescription>
          Manage your saved payment methods for faster checkouts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">No payment methods saved</p>
            <p className="text-sm text-muted-foreground">
              Add a card to enable quick payments for releases and takedowns
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium">
                      {getCardBrandDisplay(method.brand)} ****{method.last4}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires {method.exp_month}/{method.exp_year}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCard(method.id)}
                  disabled={deleting === method.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {deleting === method.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Your payment information is securely stored by Stripe</span>
        </div>

        <Button
          onClick={() => setShowAddCard(true)}
          variant="outline"
          className="w-full border-primary/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Payment Method
        </Button>

        <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Add Payment Method
              </DialogTitle>
              <DialogDescription>
                Add a new card for quick payments
              </DialogDescription>
            </DialogHeader>
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <AddCardForm
                  onComplete={handleAddCardComplete}
                  onCancel={() => setShowAddCard(false)}
                />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
