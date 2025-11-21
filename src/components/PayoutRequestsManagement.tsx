import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";

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

export const PayoutRequestsManagement = () => {
  const queryClient = useQueryClient();

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

  if (isLoading) {
    return <div>Loading payout requests...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Requests</CardTitle>
        <CardDescription>
          Review and manage user payout requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!payoutRequests?.length ? (
          <p className="text-sm text-muted-foreground">No payout requests yet</p>
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
                  <TableCell>${request.amount.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    {format(new Date(request.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            updateStatus.mutate({ id: request.id, status: "approved" })
                          }
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
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
  );
};
