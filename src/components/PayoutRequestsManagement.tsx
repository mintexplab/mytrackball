import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle, XCircle, DollarSign, Loader2, RefreshCw, Wallet, Send, ArrowUpRight } from "lucide-react";

interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  profiles: {
    display_name: string;
    email: string;
    user_id: string;
  };
}

interface StripeBalance {
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  recentPayouts: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    arrival_date: string | null;
    created: string;
    description: string | null;
  }[];
}

export const PayoutRequestsManagement = () => {
  const queryClient = useQueryClient();
  const [stripeBalance, setStripeBalance] = useState<StripeBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [processingPayout, setProcessingPayout] = useState(false);
  const [manualPayoutAmount, setManualPayoutAmount] = useState("");
  const [manualPayoutDialogOpen, setManualPayoutDialogOpen] = useState(false);

  const fetchStripeBalance = async () => {
    setLoadingBalance(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("stripe-balance", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      setStripeBalance(data);
    } catch (error: any) {
      console.error("Error fetching Stripe balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchStripeBalance();
  }, []);

  const { data: payoutRequests, isLoading } = useQuery({
    queryKey: ["admin-payout-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_requests")
        .select(`
          *,
          profiles:user_id(display_name, email, user_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PayoutRequest[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("payout_requests")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payout-requests"] });
      toast.success("Payout request status updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update payout request");
    },
  });

  const handlePayFromStripe = async () => {
    if (!selectedRequest) return;

    setProcessingPayout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-stripe-payout", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          amount: selectedRequest.amount,
          payoutRequestId: selectedRequest.id,
          description: `Payout to ${selectedRequest.profiles.display_name} (${selectedRequest.profiles.email})`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Payout of $${selectedRequest.amount.toFixed(2)} initiated successfully!`);
      setPayoutDialogOpen(false);
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ["admin-payout-requests"] });
      fetchStripeBalance();
    } catch (error: any) {
      console.error("Error processing payout:", error);
      toast.error(error.message || "Failed to process payout");
    } finally {
      setProcessingPayout(false);
    }
  };

  const handleManualPayout = async () => {
    const amount = parseFloat(manualPayoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setProcessingPayout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-stripe-payout", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          amount,
          description: "Manual payout to bank account",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Payout of $${amount.toFixed(2)} CAD initiated!`);
      setManualPayoutDialogOpen(false);
      setManualPayoutAmount("");
      fetchStripeBalance();
    } catch (error: any) {
      console.error("Error processing payout:", error);
      toast.error(error.message || "Failed to process payout");
    } finally {
      setProcessingPayout(false);
    }
  };

  const openPayoutDialog = (request: PayoutRequest) => {
    setSelectedRequest(request);
    setPayoutDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount / 100);
  };

  return (
    <div className="space-y-6">
      {/* Stripe Balance Card */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                Stripe Balance
              </CardTitle>
              <CardDescription>Your Stripe account balance</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchStripeBalance} disabled={loadingBalance}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingBalance ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                size="sm" 
                onClick={() => setManualPayoutDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Payout to Bank
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBalance ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : stripeBalance ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-3xl font-bold text-emerald-500">
                  {formatCurrency(stripeBalance.availableBalance)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-muted-foreground">Pending Balance</p>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(stripeBalance.pendingBalance)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load balance</p>
          )}
        </CardContent>
      </Card>

      {/* Payout Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
          <CardDescription>
            Review and manage user payout requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !payoutRequests?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payout requests yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.profiles.display_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.profiles.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{request.profiles.user_id}</TableCell>
                    <TableCell className="font-bold">${request.amount.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {format(new Date(request.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => openPayoutDialog(request)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Pay
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus.mutate({ id: request.id, status: "approved" })
                            }
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              updateStatus.mutate({ id: request.id, status: "rejected" })
                            }
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pay from Stripe Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Process Payout
            </DialogTitle>
            <DialogDescription>
              Pay {selectedRequest?.profiles.display_name} from your Stripe balance
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground">Amount to pay</p>
              <p className="text-2xl font-bold">${selectedRequest?.amount.toFixed(2)} CAD</p>
            </div>

            {stripeBalance && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-muted-foreground">Available Stripe Balance</p>
                <p className="text-lg font-bold text-emerald-500">
                  {formatCurrency(stripeBalance.availableBalance)}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handlePayFromStripe}
                disabled={processingPayout}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {processingPayout ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Payout
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPayoutDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Payout Dialog */}
      <Dialog open={manualPayoutDialogOpen} onOpenChange={setManualPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              Payout to Bank Account
            </DialogTitle>
            <DialogDescription>
              Transfer funds from your Stripe balance to your connected bank account
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {stripeBalance && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-lg font-bold text-emerald-500">
                  {formatCurrency(stripeBalance.availableBalance)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (CAD)</label>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount..."
                value={manualPayoutAmount}
                onChange={(e) => setManualPayoutAmount(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleManualPayout}
                disabled={processingPayout || !manualPayoutAmount}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {processingPayout ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Initiate Payout
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setManualPayoutDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
