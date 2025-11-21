import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, CheckCircle } from "lucide-react";

interface SublabelInvitationAcceptanceProps {
  userId: string;
}

const SublabelInvitationAcceptance = ({ userId }: SublabelInvitationAcceptanceProps) => {
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkForInvitations();
  }, [userId]);

  const checkForInvitations = async () => {
    // Get user's email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (!profile?.email) return;

    // Check for pending invitations
    const { data: invitations } = await supabase
      .from("sublabel_invitations")
      .select(`
        *,
        inviter:profiles!sublabel_invitations_inviter_id_fkey(display_name, full_name, label_name, email)
      `)
      .eq("invitee_email", profile.email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    if (invitations && invitations.length > 0) {
      setPendingInvitations(invitations);
      setShowDialog(true);
    }
  };

  const acceptInvitation = async (invitation: any) => {
    setProcessing(true);
    try {
      // Update invitation status
      const { error: inviteError } = await supabase
        .from("sublabel_invitations")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", invitation.id);

      if (inviteError) throw inviteError;

      // Update profile to set parent account
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ parent_account_id: invitation.inviter_id })
        .eq("id", userId);

      if (profileError) throw profileError;

      toast.success(`You're now a sublabel of ${invitation.inviter.label_name || invitation.inviter.display_name}!`);
      
      // Remove accepted invitation from list
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      
      // Close dialog if no more invitations
      if (pendingInvitations.length === 1) {
        setShowDialog(false);
      }

      // Refresh page to show new relationship
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error("Failed to accept invitation");
    } finally {
      setProcessing(false);
    }
  };

  const declineInvitation = async (invitationId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("sublabel_invitations")
        .update({ status: "declined" })
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation declined");
      
      // Remove declined invitation from list
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // Close dialog if no more invitations
      if (pendingInvitations.length === 1) {
        setShowDialog(false);
      }
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast.error("Failed to decline invitation");
    } finally {
      setProcessing(false);
    }
  };

  if (pendingInvitations.length === 0) return null;

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="bg-card border-border" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Sublabel Invitation
          </DialogTitle>
          <DialogDescription>
            You have {pendingInvitations.length} pending sublabel {pendingInvitations.length === 1 ? 'invitation' : 'invitations'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {pendingInvitations.map((invitation) => (
            <div key={invitation.id} className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
              <div>
                <h3 className="font-semibold text-lg">
                  {invitation.inviter.label_name || invitation.inviter.display_name || invitation.inviter.full_name}
                </h3>
                <p className="text-sm text-muted-foreground">{invitation.inviter.email}</p>
              </div>
              <p className="text-sm">
                has invited you to join as a sublabel. You'll be able to submit releases under their label and collaborate with their team.
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => acceptInvitation(invitation)}
                  disabled={processing}
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button
                  onClick={() => declineInvitation(invitation.id)}
                  disabled={processing}
                  variant="outline"
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SublabelInvitationAcceptance;
