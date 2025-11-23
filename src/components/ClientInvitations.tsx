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
import { UserPlus, Mail, Trash2, Clock, CheckCircle, XCircle, UserX } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
  labelId: z.string().min(1, "Select a label"),
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
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedLabelId, setSelectedLabelId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchInvitations();
    fetchLabels();
    fetchActiveUsers();
  }, []);

  const fetchLabels = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("user_label_memberships")
      .select("*")
      .eq("user_id", user?.id)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Error fetching labels:", error);
    } else {
      setLabels(data || []);
    }
  };

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
        permissions: selectedPermissions,
        labelId: selectedLabelId
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

      // Get selected label details
      const selectedLabel = labels.find(l => l.label_id === validatedData.labelId);

      // Create invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from("sublabel_invitations")
        .insert({
          inviter_id: user?.id,
          invitee_email: validatedData.email,
          status: "pending",
          invitation_type: "client",
          permissions: validatedData.permissions,
          label_id: validatedData.labelId,
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
          labelName: selectedLabel?.label_name || "My Trackball",
          invitationId: invitation.id,
          invitationType: "client",
          permissions: validatedData.permissions,
          appUrl: window.location.origin,
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
      setSelectedLabelId("");
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

  const fetchActiveUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get users who have this account as parent
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, display_name, full_name")
      .eq("parent_account_id", user?.id);

    if (profileError) {
      console.error("Error fetching active users:", profileError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      setActiveUsers([]);
      return;
    }

    // Get permissions for each user
    const usersWithPermissions = await Promise.all(
      profiles.map(async (profile) => {
        const { data: permissions } = await supabase
          .from("user_permissions")
          .select("permission, id")
          .eq("user_id", profile.id)
          .eq("granted_by", user?.id);

        return {
          ...profile,
          permissions: permissions || []
        };
      })
    );

    setActiveUsers(usersWithPermissions);
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

  const deleteInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from("sublabel_invitations")
      .delete()
      .eq("id", invitationId);

    if (error) {
      toast.error("Failed to delete invitation");
      return;
    }

    toast.success("Invitation deleted");
    fetchInvitations();
  };

  const revokePermission = async (userId: string, permissionId: string) => {
    const { error } = await supabase
      .from("user_permissions")
      .delete()
      .eq("id", permissionId);

    if (error) {
      toast.error("Failed to revoke permission");
      return;
    }

    toast.success("Permission revoked");
    fetchActiveUsers();
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete this user account (${email})? This action cannot be undone and will remove all their data.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success("User account deleted successfully");
      fetchActiveUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    }
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
            <CardTitle className="text-2xl font-bold text-left">User Management</CardTitle>
            <CardDescription className="text-left">
              Manage invitations and active users with permissions
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

                <div className="space-y-2">
                  <Label htmlFor="labelSelect">Assign to Label</Label>
                  <Select value={selectedLabelId} onValueChange={setSelectedLabelId}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select a label" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {labels.map((label) => (
                        <SelectItem key={label.label_id} value={label.label_id}>
                          {label.label_name} (ID:{label.label_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The user will be assigned to this label when they accept
                  </p>
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
                  disabled={sending || selectedPermissions.length === 0 || !selectedLabelId}
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
        <Tabs defaultValue="invitations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="active">Active Users</TabsTrigger>
          </TabsList>

          <TabsContent value="invitations">
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
                        <div className="flex gap-2">
                          {invite.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelInvitation(invite.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {(invite.status === "expired" || invite.status === "declined") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteInvitation(invite.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="active">
            {activeUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active users yet. Invited users will appear here when they accept.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.display_name || user.full_name || "User"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                       <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.permissions.length === 0 ? (
                            <span className="text-sm text-muted-foreground">No permissions</span>
                          ) : (
                            user.permissions.map((perm: any) => (
                              <Badge 
                                key={perm.id} 
                                variant="outline" 
                                className="text-xs flex items-center gap-1"
                              >
                                {PERMISSIONS.find(p => p.id === perm.permission)?.label}
                                <button
                                  onClick={() => revokePermission(user.id, perm.id)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteUser(user.id, user.email)}
                          className="text-destructive hover:text-destructive"
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ClientInvitations;
