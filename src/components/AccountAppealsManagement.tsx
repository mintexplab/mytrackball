import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AccountAppealsManagement = () => {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');

  useEffect(() => {
    fetchAppeals();

    // Set up real-time subscription
    const channel = supabase
      .channel('appeals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_appeals'
        },
        () => {
          fetchAppeals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAppeals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("account_appeals")
      .select("*")
      .order("created_at", { ascending: false });

    setAppeals(data || []);
    setLoading(false);
  };

  const handleReview = (appeal: any, action: 'approved' | 'rejected') => {
    setSelectedAppeal(appeal);
    setReviewAction(action);
    setAdminNotes("");
    setShowReviewDialog(true);
  };

  const submitReview = async () => {
    if (!selectedAppeal) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update appeal status
      const { error: updateError } = await supabase
        .from("account_appeals")
        .update({
          status: reviewAction,
          admin_notes: adminNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedAppeal.id);

      if (updateError) throw updateError;

      // If approved, unban the user
      if (reviewAction === 'approved') {
        const { error: unbanError } = await supabase
          .from("profiles")
          .update({ is_banned: false })
          .eq("id", selectedAppeal.user_id);

        if (unbanError) throw unbanError;
      }

      // Send notification email
      const { error: emailError } = await supabase.functions.invoke('send-appeal-decision', {
        body: {
          userEmail: selectedAppeal.user_email,
          userName: selectedAppeal.user_name,
          decision: reviewAction,
          adminNotes,
        },
      });

      if (emailError) {
        console.error("Failed to send email:", emailError);
      }

      toast.success(`Appeal ${reviewAction}!`);
      setShowReviewDialog(false);
      fetchAppeals();
    } catch (error: any) {
      console.error("Error reviewing appeal:", error);
      toast.error("Failed to process appeal");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="text-2xl font-bold">Account Appeals</CardTitle>
              <CardDescription>Review and manage user account termination appeals</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && appeals.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : appeals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No appeals submitted yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appeals.map((appeal) => (
                  <TableRow key={appeal.id}>
                    <TableCell className="font-medium">{appeal.user_name}</TableCell>
                    <TableCell className="text-muted-foreground">{appeal.user_email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(appeal.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>{getStatusBadge(appeal.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {appeal.status === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleReview(appeal, 'approved')}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReview(appeal, 'rejected')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline">Reviewed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="bg-card border-primary/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approved' ? 'Approve' : 'Reject'} Appeal
            </DialogTitle>
            <DialogDescription>
              Review the user's appeal and provide notes
            </DialogDescription>
          </DialogHeader>

          {selectedAppeal && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm font-semibold mb-2">User: {selectedAppeal.user_name}</p>
                <p className="text-sm text-muted-foreground mb-4">Email: {selectedAppeal.user_email}</p>
                <p className="text-sm font-semibold mb-2">Appeal Reason:</p>
                <p className="text-sm whitespace-pre-wrap">{selectedAppeal.appeal_reason}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Admin Notes {reviewAction === 'rejected' && <span className="text-destructive">*</span>}</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add notes about your decision (will be included in email to user if rejected)"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="min-h-[100px] bg-background/50 border-border"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={loading || (reviewAction === 'rejected' && !adminNotes.trim())}
              className={reviewAction === 'approved' ? 'bg-green-500 hover:bg-green-600' : 'bg-destructive hover:bg-destructive/90'}
            >
              {loading ? 'Processing...' : `${reviewAction === 'approved' ? 'Approve' : 'Reject'} Appeal`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccountAppealsManagement;
