import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, Shield, Music, Disc, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  created: number;
  description: string;
  customer_email?: string;
}

export const TestPaymentSection = () => {
  const [trackCount, setTrackCount] = useState(1);
  const [releaseTitle, setReleaseTitle] = useState("Test Release");
  const [artistName, setArtistName] = useState("Test Artist");
  const [customTotal, setCustomTotal] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const trackFee = 5 * trackCount;
  const upcFee = 8;
  const calculatedTotal = trackFee + upcFee;
  const finalTotal = customTotal ? parseFloat(customTotal) : calculatedTotal;

  useEffect(() => {
    fetchRecentPayments();
  }, []);

  const fetchRecentPayments = async () => {
    setLoadingPayments(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-billing-details", {
        body: { includeDrafts: false },
      });

      if (error) throw error;

      // Get recent payment intents from the billing details
      if (data?.recentPayments) {
        setPayments(data.recentPayments);
      }
    } catch (error: any) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleTestPayment = async () => {
    if (finalTotal < 0.50) {
      toast.error("Amount must be at least $0.50 CAD");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-test-checkout", {
        body: {
          amount: Math.round(finalTotal * 100), // Convert to cents
          description: `${releaseTitle} by ${artistName} (${trackCount} track${trackCount > 1 ? 's' : ''})`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Checkout session created - opening in new tab");
        // Refresh payments after a delay to catch the new one
        setTimeout(fetchRecentPayments, 5000);
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Test payment error:", error);
      toast.error(error.message || "Failed to create test checkout");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "requires_payment_method":
      case "requires_action":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "canceled":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Form Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Test Payment Checkout
          </CardTitle>
          <CardDescription>
            Create a test checkout session with custom release details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Release Info Section */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Music className="w-4 h-4" />
              Release Details (Placeholder)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="release-title">Release Title</Label>
                <Input
                  id="release-title"
                  value={releaseTitle}
                  onChange={(e) => setReleaseTitle(e.target.value)}
                  placeholder="Enter release title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist-name">Artist Name</Label>
                <Input
                  id="artist-name"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Enter artist name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-count">Number of Tracks</Label>
                <Input
                  id="track-count"
                  type="number"
                  min={1}
                  max={25}
                  value={trackCount}
                  onChange={(e) => setTrackCount(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-total">Custom Total (optional)</Label>
                <Input
                  id="custom-total"
                  type="number"
                  step="0.01"
                  min="0.50"
                  value={customTotal}
                  onChange={(e) => setCustomTotal(e.target.value)}
                  placeholder={`Default: $${calculatedTotal.toFixed(2)}`}
                />
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Disc className="w-4 h-4" />
              Order Summary
            </h4>
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
              {customTotal && (
                <div className="flex justify-between text-amber-400">
                  <span>Custom override</span>
                  <span>${parseFloat(customTotal).toFixed(2)} CAD</span>
                </div>
              )}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">${finalTotal.toFixed(2)} CAD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Payments are secure and encrypted by Stripe</span>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleTestPayment}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Checkout...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Stripe Checkout (${finalTotal.toFixed(2)} CAD)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Payments Card */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Payments</CardTitle>
            <CardDescription>
              View payment status and verify transactions
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecentPayments}
            disabled={loadingPayments}
          >
            {loadingPayments ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {loadingPayments && payments.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent payments found</p>
              <p className="text-xs mt-1">Payments will appear here after checkout</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {payment.description || "Payment"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.created * 1000), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      ${(payment.amount / 100).toFixed(2)} CAD
                    </span>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
