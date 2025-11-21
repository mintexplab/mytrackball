import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Mail, Trash2, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
});

interface SublabelManagementProps {
  userId: string;
  userPlan: any;
  profile: any;
}

const SublabelManagement = ({ userId, userPlan, profile }: SublabelManagementProps) => {
  const [sublabels, setSublabels] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);

  const planName = userPlan?.plan?.name || "";
  const hasRequiredPlan = planName === "Trackball Signature" || planName === "Trackball Prestige";

  useEffect(() => {
    if (hasRequiredPlan) {
      fetchSublabels();
      fetchInvitations();
    } else {
      setLoading(false);
    }
  }, [hasRequiredPlan, userId]);

  const fetchSublabels = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("parent_account_id", userId);

    if (error) {
      console.error("Error fetching sublabels:", error);
      return;
    }

    setSublabels(data || []);
    setLoading(false);
  };

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from("sublabel_invitations")
      .select("*")
      .eq("inviter_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitations:", error);
      return;
    }

    setInvitations(data || []);
  };

  const sendInvitation = async () => {
    try {
      const validatedData = inviteSchema.parse({ email: inviteEmail });
      setSending(true);

      // Check if user already has a sublabel relationship
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, parent_account_id")
        .eq("email", validatedData.email)
        .maybeSingle();

      if (existingProfile?.parent_account_id) {
        toast.error("This user is already a sublabel of another account");
        setSending(false);
        return;
      }

      // Check if invitation already exists
      const { data: existingInvite } = await supabase
        .from("sublabel_invitations")
        .select("id")
        .eq("invitee_email", validatedData.email)
        .eq("inviter_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingInvite) {
        toast.error("An invitation has already been sent to this email");
        setSending(false);
        return;
      }

      // Create invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from("sublabel_invitations")
        .insert({
          inviter_id: userId,
          invitee_email: validatedData.email,
          status: "pending",
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke("send-sublabel-invitation", {
        body: {
          inviterName: profile?.display_name || profile?.full_name || "A label owner",
          inviterEmail: profile?.email,
          inviteeEmail: validatedData.email,
          labelName: profile?.label_name || "My Trackball",
          invitationId: invitation.id,
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.warning("Invitation created but email may not have been sent");
      } else {
        toast.success("Invitation sent successfully!");
      }

      setDialogOpen(false);
      setInviteEmail("");
      fetchInvitations();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error sending invitation:", error);
        toast.error("Failed to send invitation");
      }
    } finally {
      setSending(false);
    }
  };

  const removeSublabel = async (sublabelId: string) => {
    if (!confirm("Are you sure you want to remove this sublabel? They will lose access to your label resources.")) {
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ parent_account_id: null })
      .eq("id", sublabelId);

    if (error) {
      toast.error("Failed to remove sublabel");
      return;
    }

    toast.success("Sublabel removed successfully");
    fetchSublabels();
  };

  const cancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from("sublabel_invitations")
      .update({ status: "expired" })
      .eq("id", invitationId);

    if (error) {
      toast.error("Failed to cancel invitation");
      return;
    }

    toast.success("Invitation cancelled");
    fetchInvitations();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; className: string }> = {
      pending: { icon: Clock, className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
      accepted: { icon: CheckCircle, className: "bg-green-500/20 text-green-300 border-green-500/30" },
      declined: { icon: XCircle, className: "bg-red-500/20 text-red-300 border-red-500/30" },
      expired: { icon: XCircle, className: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
    };

    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;

    return (
      <Badge variant="outline" className={variant.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (!hasRequiredPlan) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Sublabel Management
          </CardTitle>
          <CardDescription>Manage your sublabel roster</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Sublabel management is available for Trackball Signature and Prestige members.
            </p>
            <Button
              onClick={() => window.location.href = "/subscription"}
              className="bg-gradient-primary hover:opacity-90"
            >
              Upgrade Your Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Sublabels */}
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                My Sublabels
              </CardTitle>
              <CardDescription>
                Manage accounts operating under your label
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:opacity-90">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Sublabel
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-bold">Invite Sublabel Account</DialogTitle>
                  <DialogDescription>
                    Send an invitation to an artist or label to join as a sublabel
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email Address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      placeholder="artist@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <Button
                    onClick={sendInvitation}
                    disabled={sending}
                    className="w-full bg-gradient-primary hover:opacity-90"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {sending ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {sublabels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sublabels yet. Invite artists or labels to join your roster.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sublabels.map((sublabel) => (
                  <TableRow key={sublabel.id}>
                    <TableCell className="font-medium">
                      {sublabel.display_name || sublabel.full_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sublabel.user_id}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{sublabel.email}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSublabel(sublabel.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Pending Invitations</CardTitle>
          <CardDescription>Track invitations you've sent</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invitations sent yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">{invite.invitee_email}</TableCell>
                    <TableCell>{getStatusBadge(invite.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(invite.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {invite.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelInvitation(invite.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SublabelManagement;
