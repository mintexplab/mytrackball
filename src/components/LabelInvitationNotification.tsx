import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Crown, Star } from "lucide-react";
import { toast } from "sonner";

interface LabelInvitation {
  id: string;
  inviter_id: string;
  label_id: string;
  permissions: string[];
  created_at: string;
  inviter_profile?: {
    display_name: string;
    full_name: string;
    label_type: string;
  };
  label?: {
    label_name: string;
    label_id: string;
  };
}

export const LabelInvitationNotification = () => {
  const [invitation, setInvitation] = useState<LabelInvitation | null>(null);
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkForPendingInvitation();
  }, []);

  const checkForPendingInvitation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      if (!profile?.email) return;

      // Check for pending sublabel invitations
      const { data: invitations } = await supabase
        .from("sublabel_invitations")
        .select(`
          id,
          inviter_id,
          label_id,
          permissions,
          created_at,
          labels!inner(label_name, label_id)
        `)
        .eq("invitee_email", profile.email)
        .eq("status", "pending")
        .eq("invitation_type", "client")
        .order("created_at", { ascending: false })
        .limit(1);

      if (invitations && invitations.length > 0) {
        const inv = invitations[0];
        
        // Get inviter profile info
        const { data: inviterProfile } = await supabase
          .from("profiles")
          .select("display_name, full_name, label_type")
          .eq("id", inv.inviter_id)
          .single();

        setInvitation({
          ...inv,
          inviter_profile: inviterProfile || undefined,
          label: inv.labels as any,
        });
        setOpen(true);
      }
    } catch (error) {
      console.error("Error checking invitation:", error);
    }
  };

  const handleAccept = async () => {
    if (!invitation) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Update invitation status
      const { error: updateError } = await supabase
        .from("sublabel_invitations")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      // Add user permissions
      const permissionsToAdd = invitation.permissions.map(permission => ({
        user_id: user.id,
        permission,
        granted_by: invitation.inviter_id,
      }));

      const { error: permError } = await supabase
        .from("user_permissions")
        .insert(permissionsToAdd);

      if (permError) throw permError;

      // Add to label memberships if not already a member
      const { data: existingMembership } = await supabase
        .from("user_label_memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("label_id", invitation.label_id)
        .maybeSingle();

      if (!existingMembership && invitation.label) {
        const { error: membershipError } = await supabase
          .from("user_label_memberships")
          .insert({
            user_id: user.id,
            label_id: invitation.label_id,
            label_name: invitation.label.label_name,
            role: "member",
          });

        if (membershipError) throw membershipError;
      }

      toast.success("Successfully joined the label!");
      setOpen(false);
      
      // Reload to reflect changes
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error("Failed to accept invitation");
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from("sublabel_invitations")
        .update({ status: "declined" })
        .eq("id", invitation.id);

      if (error) throw error;

      toast.success("Invitation declined");
      setOpen(false);
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast.error("Failed to decline invitation");
    } finally {
      setProcessing(false);
    }
  };

  if (!invitation) return null;

  const getLabelIcon = (labelType?: string) => {
    if (labelType === "Label Prestige") return <Crown className="h-4 w-4" />;
    if (labelType === "Label Signature") return <Star className="h-4 w-4" />;
    if (labelType === "Label Partner") return <Building2 className="h-4 w-4" />;
    return <Building2 className="h-4 w-4" />;
  };

  const inviterName = invitation.inviter_profile?.display_name || 
                      invitation.inviter_profile?.full_name || 
                      "A label";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Label Invitation
          </DialogTitle>
          <DialogDescription>
            You've been invited to join a label account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              <span className="font-semibold">{inviterName}</span> has invited you to join their label account for{" "}
              <span className="font-semibold">{invitation.label?.label_name}</span>
            </p>

            {invitation.label?.label_id && (
              <p className="text-xs text-muted-foreground">
                Label ID: {invitation.label.label_id}
              </p>
            )}
          </div>

          {invitation.inviter_profile?.label_type && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                {getLabelIcon(invitation.inviter_profile.label_type)}
                {invitation.inviter_profile.label_type}
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">You'll have access to:</p>
            <div className="flex flex-wrap gap-2">
              {invitation.permissions.map((permission) => (
                <Badge key={permission} variant="outline">
                  {permission}
                </Badge>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            By accepting, you'll be able to access this label's {invitation.permissions.join(", ")} features.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={processing}
          >
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={processing}
          >
            {processing ? "Accepting..." : "Accept Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
