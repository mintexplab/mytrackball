import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Music, CreditCard, Loader2, Sparkles, Check } from "lucide-react";
import { useSavedPaymentMethod } from "@/hooks/useSavedPaymentMethod";
import { PaymentMethodSetup } from "./PaymentMethodSetup";

export const TrackAllowancePlan = () => {
  const [tracksPerMonth, setTracksPerMonth] = useState(10);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);
  const { paymentMethod, loading: paymentLoading, refetch: refetchPayment } = useSavedPaymentMethod();

  // Tiered pricing: $4/track for 5-45 tracks, $2/track for 46+ tracks
  const pricePerTrack = tracksPerMonth > 45 ? 2 : 4;
  const regularPricePerTrack = 5;
  const monthlyPrice = tracksPerMonth * pricePerTrack;
  const savings = tracksPerMonth * (regularPricePerTrack - pricePerTrack);
  const discountPercentage = tracksPerMonth > 45 ? 60 : 20;

  const handleSubscribe = async () => {
    if (!paymentMethod) {
      setShowPaymentSetup(true);
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmSubscription = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-track-allowance-subscription", {
        body: { 
          tracksPerMonth,
          paymentMethodId: paymentMethod?.id 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.open(data.url, "_blank");
      } else if (data?.success) {
        toast.success(`Track Allowance plan activated! You have ${tracksPerMonth} tracks/month.`);
        setShowConfirmDialog(false);
      }
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      toast.error(error.message || "Failed to create subscription");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSetupComplete = () => {
    setShowPaymentSetup(false);
    refetchPayment();
    setShowConfirmDialog(true);
  };

  return (
    <>
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Track Allowance Plan
              </CardTitle>
              <CardDescription>
                Save money with a monthly track subscription
              </CardDescription>
            </div>
            <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
              Save {discountPercentage}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">
              How many tracks do you expect to submit per month?
            </p>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl font-bold text-foreground">{tracksPerMonth}</span>
              <span className="text-muted-foreground">tracks/month</span>
            </div>
            
            <Slider
              value={[tracksPerMonth]}
              onValueChange={(value) => setTracksPerMonth(value[0])}
              min={5}
              max={100}
              step={5}
              className="mb-4"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 tracks</span>
              <span className="text-emerald-500 font-medium">46+ = $2/track</span>
              <span>100 tracks</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Price per track</span>
              <div className="text-right">
                <span className="text-lg font-bold text-foreground">${pricePerTrack} CAD</span>
                <span className="text-xs text-muted-foreground line-through ml-2">${regularPricePerTrack}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/30">
              <span className="font-medium text-foreground">Monthly Total</span>
              <span className="text-2xl font-bold text-primary">${monthlyPrice} CAD</span>
            </div>
            
            {savings > 0 && (
              <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <span className="text-sm text-emerald-500">You save</span>
                <span className="font-bold text-emerald-500">${savings} CAD/month</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-accent" />
              <span>Submit up to <strong className="text-foreground">{tracksPerMonth} tracks</strong> per month</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-accent" />
              <span>No upfront payment per track</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-accent" />
              <span>Exceed limit? Pay upfront or wait for next month</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-accent" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-accent" />
              <span>UPC fees still apply ($8 CAD per release)</span>
            </div>
          </div>

          <Button
            onClick={handleSubscribe}
            disabled={loading || paymentLoading}
            className="w-full bg-gradient-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Music className="w-4 h-4 mr-2" />
                Subscribe for ${monthlyPrice}/month
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Confirm Dialog with Payment Method on File */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              We have a payment method on file!
            </DialogTitle>
            <DialogDescription>
              Confirm your Track Allowance subscription
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-foreground">
                  {paymentMethod?.brand?.charAt(0).toUpperCase()}{paymentMethod?.brand?.slice(1)} •••• {paymentMethod?.last4}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Expires {paymentMethod?.exp_month}/{paymentMethod?.exp_year}
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{tracksPerMonth} tracks/month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per track</span>
                <span className="font-medium">${pricePerTrack} CAD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly charge</span>
                <span className="font-bold text-primary">${monthlyPrice} CAD</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={confirmSubscription}
                disabled={loading}
                className="flex-1 bg-gradient-primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Subscription"
                )}
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Setup Dialog */}
      <Dialog open={showPaymentSetup} onOpenChange={setShowPaymentSetup}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Add Payment Method
            </DialogTitle>
            <DialogDescription>
              Add a payment method to subscribe to the Track Allowance plan
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <PaymentMethodSetup 
              onComplete={handlePaymentSetupComplete}
              onSkip={() => setShowPaymentSetup(false)}
              hideSkip={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
