import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";

const PendingLabelInvitations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingInvitations();
  }, []);

  const fetchPendingInvitations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("sublabel_invitations")
        .select(`
          *,
          inviter:profiles!sublabel_invitations_inviter_id_fkey(display_name, label_name, email)
        `)
        .eq("invitee_email", profile.email)
        .eq("status", "pending")
        .eq("invitation_type", "client")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string) => {
    setAcceptingId(invitationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const invitation = invitations.find(inv => inv.id === invitationId);
      if (!invitation) throw new Error("Invitation not found");

      // Update invitation status
      const { error: updateError } = await supabase
        .from("sublabel_invitations")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      // Grant permissions
      if (invitation.permissions && invitation.permissions.length > 0) {
        const permissionsToInsert = invitation.permissions.map((permission: string) => ({
          user_id: user.id,
          permission: permission,
          granted_by: invitation.inviter_id,
        }));

        const { error: permError } = await supabase
          .from("user_permissions")
          .insert(permissionsToInsert);

        if (permError) throw permError;
      }

      // Update profile with parent account info
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          parent_account_id: invitation.inviter_id,
          label_name: invitation.inviter.label_name || null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      toast.success("Invitation accepted successfully!");
      fetchPendingInvitations();
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error(error.message || "Failed to accept invitation");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (invitationId: string) => {
    setRejectingId(invitationId);
    try {
      const { error } = await supabase
        .from("sublabel_invitations")
        .update({ status: "rejected" })
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation rejected");
      fetchPendingInvitations();
    } catch (error: any) {
      console.error("Error rejecting invitation:", error);
      toast.error("Failed to reject invitation");
    } finally {
      setRejectingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-2">Pending Invitations</h1>
          <p className="text-muted-foreground">
            Review and respond to label invitations
          </p>
        </div>

        {invitations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No pending invitations at this time
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="mt-4"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardHeader>
                  <CardTitle className="text-xl">
                    {invitation.inviter?.label_name || invitation.inviter?.display_name}
                  </CardTitle>
                  <CardDescription>
                    Invited by {invitation.inviter?.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {invitation.permissions && invitation.permissions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Access Permissions:</p>
                      <div className="flex flex-wrap gap-2">
                        {invitation.permissions.map((perm: string) => (
                          <Badge key={perm} variant="outline">
                            {perm.charAt(0).toUpperCase() + perm.slice(1)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAccept(invitation.id)}
                      disabled={acceptingId === invitation.id || rejectingId === invitation.id}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {acceptingId === invitation.id ? "Accepting..." : "Accept"}
                    </Button>
                    <Button
                      onClick={() => handleReject(invitation.id)}
                      disabled={acceptingId === invitation.id || rejectingId === invitation.id}
                      variant="outline"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {rejectingId === invitation.id ? "Rejecting..." : "Reject"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingLabelInvitations;
