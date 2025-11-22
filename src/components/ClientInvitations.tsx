import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserPlus, Mail, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
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
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
});

const PERMISSIONS = [
  { id: "catalog", label: "Catalog", description: "Access to releases and submissions" },
  { id: "royalties", label: "Royalties", description: "View royalty reports and earnings" },
  { id: "announcements", label: "Announcements", description: "View platform announcements" },
  { id: "support", label: "Support", description: "Access support and help resources" },
  { id: "settings", label: "Settings", description: "Modify account settings" },
];

const ClientInvitations = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("sublabel_invitations")
      .select("*")
      .eq("invitation_type", "client")
      .eq("inviter_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitations:", error);
      toast.error("Failed to load invitations");
    } else {
      setInvitations(data || []);
    }
    setLoading(false);
  };

  const sendInvitation = async () => {
    try {
      const validatedData = inviteSchema.parse({ 
        email: inviteEmail,
        permissions: selectedPermissions 
      });
      setSending(true);

      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", validatedData.email)
        .maybeSingle();

      if (existingProfile) {
        toast.error("A user with this email already exists");
        setSending(false);
        return;
      }

      // Check if invitation already exists
      const { data: existingInvite } = await supabase
        .from("sublabel_invitations")
        .select("id")
        .eq("invitee_email", validatedData.email)
        .eq("status", "pending")
        .maybeSingle();

      if (existingInvite) {
        toast.error("An invitation has already been sent to this email");
        setSending(false);
        return;
      }

      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      
      // Verify user has Signature or Prestige plan
      const { data: userPlan } = await supabase
        .from("user_plans")
        .select(`
          *,
          plan:plans(name)
        `)
        .eq("user_id", user?.id)
        .eq("status", "active")
        .single();

      const planName = userPlan?.plan?.name;
      if (planName !== "Trackball Signature" && planName !== "Trackball Prestige") {
        toast.error("Only Signature and Prestige members can send invitations");
        setSending(false);
        return;
      }

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      // Create invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from("sublabel_invitations")
        .insert({
          inviter_id: user?.id,
          invitee_email: validatedData.email,
          status: "pending",
          invitation_type: "client",
          permissions: validatedData.permissions,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke("send-client-invitation", {
        body: {
          inviterName: userProfile?.display_name || userProfile?.full_name || "Trackball User",
          inviterEmail: userProfile?.email,
          inviteeEmail: validatedData.email,
          labelName: userProfile?.label_name || "My Trackball",
          invitationId: invitation.id,
          invitationType: "client",
          permissions: validatedData.permissions,
          appUrl: window.location.origin, // Pass current app URL
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
      setSelectedPermissions([]);
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

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-bold text-left">User Invitations</CardTitle>
            <CardDescription className="text-left">
              Invite users with specific permissions to access your platform
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle className="font-bold">Invite User Account</DialogTitle>
                <DialogDescription>
                  Send an invitation with specific permissions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email Address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <div className="space-y-2">
                    {PERMISSIONS.map((permission) => (
                      <div key={permission.id} className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-background/50">
                        <Checkbox
                          id={permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={permission.id}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {permission.label}
                          </label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={sendInvitation}
                  disabled={sending || selectedPermissions.length === 0}
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
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No invitations sent yet. Invite users to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Permissions</TableHead>
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
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {invite.permissions?.map((perm: string) => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {PERMISSIONS.find(p => p.id === perm)?.label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
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
                        <Trash2 className="w-4 h-4" />
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
  );
};

export default ClientInvitations;
