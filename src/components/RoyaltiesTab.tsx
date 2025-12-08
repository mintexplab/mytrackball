import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";
import { CollaboratorsManagement } from "./CollaboratorsManagement";
import { z } from "zod";
import { usePreferredCurrency } from "@/hooks/usePreferredCurrency";
import { convertCurrency, formatCurrency } from "./CurrencySelector";

const PartnerRoyaltySplitDisplay = ({ userId }: { userId: string }) => {
  const [splitInfo, setSplitInfo] = useState<{ royalty_split_percentage: number } | null>(null);

  useEffect(() => {
    const fetchSplitInfo = async () => {
      const { data, error } = await supabase
        .from("partner_royalty_splits")
        .select("royalty_split_percentage")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setSplitInfo(data);
      }
    };

    fetchSplitInfo();
  }, [userId]);

  if (!splitInfo) return null;

  return (
    <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
      <p className="text-sm text-muted-foreground">Custom Partner Split</p>
      <p className="text-lg font-semibold text-primary">
        You keep {splitInfo.royalty_split_percentage}% of royalties
      </p>
    </div>
  );
};

const payoutSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(10, 'Minimum payout amount is $10.00')
    .max(1000000, 'Amount exceeds maximum allowed ($1,000,000)')
});

interface Royalty {
  id: string;
  amount: number;
  period: string;
  notes: string;
  created_at: string;
}

interface RoyaltiesTabProps {
  userId: string;
}

const RoyaltiesTab = ({ userId }: RoyaltiesTabProps) => {
  const queryClient = useQueryClient();
  const [royalties, setRoyalties] = useState<Royalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [payoutNotes, setPayoutNotes] = useState("");
  const { currency } = usePreferredCurrency();

  useEffect(() => {
    fetchRoyalties();
  }, [userId]);

  const fetchRoyalties = async () => {
    const { data, error } = await supabase
      .from("royalties")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load royalties");
      return;
    }

    setRoyalties(data || []);
    const total = data?.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0) || 0;
    setTotalEarnings(total);
    setLoading(false);
  };

  const requestPayout = useMutation({
    mutationFn: async () => {
      // Validate payout amount
      try {
        payoutSchema.parse({ amount: totalEarnings });
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(error.errors[0].message);
        }
        throw error;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, email, user_id, id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw new Error("Failed to fetch profile");
      }

      // Check for existing pending requests
      const { data: existingRequests, error: checkError } = await supabase
        .from('payout_requests')
        .select('id')
        .eq('user_id', profile.id)
        .eq('status', 'pending');

      if (checkError) {
        throw new Error("Failed to check existing requests");
      }

      if (existingRequests && existingRequests.length > 0) {
        throw new Error('You already have a pending payout request');
      }

      // Create payout request using profile.id (same as auth user id)
      const { data: payoutData, error: payoutError } = await supabase
        .from("payout_requests")
        .insert({
          user_id: profile.id,
          amount: totalEarnings,
          notes: payoutNotes || null,
        })
        .select()
        .single();

      if (payoutError) {
        console.error("Payout request error:", payoutError);
        throw new Error(payoutError.message || "Failed to create payout request");
      }

      // Send notification email
      try {
        await supabase.functions.invoke("send-system-notification", {
          body: {
            type: "payout_request",
            data: {
              userName: profile?.display_name,
              userEmail: profile?.email,
              userId: profile?.user_id,
              amount: totalEarnings,
            },
          },
        });
      } catch (emailError) {
        console.error("Email notification error:", emailError);
        // Don't fail the payout request if email fails
      }

      return payoutData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-royalties"] });
      toast.success("Payout request submitted successfully");
      setPayoutNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit payout request");
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-gradient-primary/10 border-primary/30">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-3 text-left">
            <DollarSign className="w-8 h-8 text-primary" />
            Total Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-primary">
            {formatCurrency(convertCurrency(totalEarnings, currency), currency)}
          </p>
          {currency !== "CAD" && (
            <p className="text-sm text-muted-foreground mt-1">
              ≈ ${totalEarnings.toFixed(2)} CAD
            </p>
          )}
          {/* Show custom royalty split for partner accounts */}
          <PartnerRoyaltySplitDisplay userId={userId} />
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-left">Payment History</CardTitle>
          <CardDescription className="text-left">Your royalty payment records</CardDescription>
        </CardHeader>
        <CardContent>
          {royalties.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No royalty payments yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your earnings will appear here once royalties are processed
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {royalties.map((royalty) => (
                <Card key={royalty.id} className="bg-muted/30 border-border">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg text-foreground">
                          {formatCurrency(convertCurrency(parseFloat(royalty.amount.toString()), currency), currency)}
                        </p>
                        {currency !== "CAD" && (
                          <p className="text-xs text-muted-foreground">
                            ≈ ${parseFloat(royalty.amount.toString()).toFixed(2)} CAD
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Period: {royalty.period}
                        </p>
                        {royalty.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {royalty.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(royalty.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-left">Request Payout</CardTitle>
          <CardDescription className="text-left">
            Submit a request to withdraw your earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Available balance</p>
              <p className="text-2xl font-bold">
                {formatCurrency(convertCurrency(totalEarnings, currency), currency)}
              </p>
              {currency !== "CAD" && (
                <p className="text-xs text-muted-foreground">≈ ${totalEarnings.toFixed(2)} CAD</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Add any notes about this payout request..."
                rows={3}
              />
            </div>
            <Button
              onClick={() => requestPayout.mutate()}
              disabled={totalEarnings === 0 || requestPayout.isPending}
              className="w-full"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Request Payout
            </Button>
          </div>
        </CardContent>
      </Card>

      <CollaboratorsManagement />
    </div>
  );
};

export default RoyaltiesTab;
