import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Music, Loader2, RefreshCw, Settings, Calendar, Sparkles, Plus } from "lucide-react";
import { format } from "date-fns";
import { TrackAllowancePlan } from "./TrackAllowancePlan";
import { useSavedPaymentMethod } from "@/hooks/useSavedPaymentMethod";

interface TrackAllowanceData {
  hasSubscription: boolean;
  subscriptionId?: string;
  tracksAllowed: number;
  tracksUsed: number;
  tracksRemaining: number;
  monthlyAmount: number;
  currentPeriodEnd?: string;
}

export const TrackAllowanceTab = () => {
  const [loading, setLoading] = useState(true);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [data, setData] = useState<TrackAllowanceData | null>(null);
  const [addTracksDialogOpen, setAddTracksDialogOpen] = useState(false);
  const [extraTracks, setExtraTracks] = useState(10);
  const [addingTracks, setAddingTracks] = useState(false);
  const { paymentMethod } = useSavedPaymentMethod();

  const fetchAllowance = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: result, error } = await supabase.functions.invoke("check-track-allowance", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setData(result);
    } catch (error: any) {
      console.error("Error fetching track allowance:", error);
      toast.error("Failed to fetch track allowance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllowance();
  }, []);

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: result, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (result?.url) {
        window.open(result.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast.error(error.message || "Failed to open subscription management");
    } finally {
      setManagingSubscription(false);
    }
  };

  const handleAddExtraTracks = async () => {
    setAddingTracks(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: result, error } = await supabase.functions.invoke("add-extra-tracks", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          extraTracks,
          paymentMethodId: paymentMethod?.id,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast.success(result.message || `Added ${extraTracks} extra tracks!`);
      setAddTracksDialogOpen(false);
      fetchAllowance();
    } catch (error: any) {
      console.error("Error adding extra tracks:", error);
      toast.error(error.message || "Failed to add extra tracks");
    } finally {
      setAddingTracks(false);
    }
  };

  // Calculate pricing for extra tracks
  const currentTracks = data?.tracksAllowed || 0;
  const newTotalTracks = currentTracks + extraTracks;
  const newPricePerTrack = newTotalTracks > 45 ? 2 : 4;
  const currentPricePerTrack = currentTracks > 45 ? 2 : 4;
  const currentMonthly = data?.monthlyAmount || 0;
  const newMonthly = newTotalTracks * newPricePerTrack;
  const additionalCost = newMonthly - currentMonthly;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.hasSubscription) {
    return (
      <div className="space-y-6">
        <TrackAllowancePlan />
      </div>
    );
  }

  const usagePercentage = data.tracksAllowed > 0 
    ? (data.tracksUsed / data.tracksAllowed) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Track Allowance
              </CardTitle>
              <CardDescription>
                Your monthly track submission allowance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchAllowance}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                Active
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Display */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Tracks Remaining This Month</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-bold text-foreground">{data.tracksRemaining}</span>
                  <span className="text-muted-foreground">/ {data.tracksAllowed}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Monthly Plan</p>
                <p className="text-2xl font-bold text-primary">${data.monthlyAmount} CAD</p>
              </div>
            </div>
            
            <Progress value={usagePercentage} className="h-3 mb-2" />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{data.tracksUsed} tracks used</span>
              <span>{data.tracksRemaining} tracks available</span>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Plan Details</span>
              </div>
              <p className="font-medium">{data.tracksAllowed} tracks/month</p>
              <p className="text-xs text-muted-foreground mt-1">
                ${data.tracksAllowed > 0 ? (data.monthlyAmount / data.tracksAllowed).toFixed(2) : '0.00'} CAD per track
              </p>
            </div>
            
            {data.currentPeriodEnd && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Next Billing Date</span>
                </div>
                <p className="font-medium">
                  {format(new Date(data.currentPeriodEnd), "MMMM d, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Allowance resets on this date
                </p>
              </div>
            )}
          </div>

          {/* Add Extra Tracks Button */}
          <Button
            onClick={() => setAddTracksDialogOpen(true)}
            variant="outline"
            className="w-full border-primary/30 hover:bg-primary/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Extra Tracks
          </Button>

          {/* Manage Subscription */}
          <Button
            onClick={handleManageSubscription}
            disabled={managingSubscription}
            variant="outline"
            className="w-full"
          >
            {managingSubscription ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Manage Subscription
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Add Extra Tracks Dialog */}
      <Dialog open={addTracksDialogOpen} onOpenChange={setAddTracksDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Add Extra Tracks
            </DialogTitle>
            <DialogDescription>
              Increase your monthly track allowance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground mb-2">
                How many extra tracks do you want to add?
              </p>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-bold text-foreground">+{extraTracks}</span>
                <span className="text-muted-foreground">extra tracks</span>
              </div>
              
              <Slider
                value={[extraTracks]}
                onValueChange={(value) => setExtraTracks(value[0])}
                min={5}
                max={50}
                step={5}
                className="mb-2"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>+5 tracks</span>
                <span>+50 tracks</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Current allowance</span>
                <span className="font-medium">{currentTracks} tracks/month</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">New allowance</span>
                <span className="font-medium text-primary">{newTotalTracks} tracks/month</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/30">
                <span className="font-medium text-foreground">New monthly price</span>
                <span className="text-xl font-bold text-primary">${newMonthly} CAD</span>
              </div>

              {data.monthlyAmount === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Your subscription is admin-granted. Extra tracks will be added for free!
                </p>
              )}
            </div>

            <Button
              onClick={handleAddExtraTracks}
              disabled={addingTracks}
              className="w-full bg-gradient-primary"
            >
              {addingTracks ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {data.monthlyAmount === 0 
                    ? `Add ${extraTracks} Extra Tracks (Free)` 
                    : `Upgrade to ${newTotalTracks} Tracks/Month`
                  }
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
