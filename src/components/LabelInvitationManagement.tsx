import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, UserPlus, X } from "lucide-react";
import { z } from "zod";

const labelInvitationSchema = z.object({
  label_name: z.string().trim().min(1, "Label name is required").max(100),
  master_account_email: z.string().email("Invalid email address").max(255),
  subscription_tier: z.enum(["Trackball Signature", "Trackball Prestige", "Trackball Partner"]),
});

const LabelInvitationManagement = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [additionalUsers, setAdditionalUsers] = useState<string[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [formData, setFormData] = useState({
    label_name: "",
    master_account_email: "",
    subscription_tier: "Trackball Signature"
  });

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from("label_invitations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load label invitations");
      console.error(error);
    } else {
      setInvitations(data || []);
    }
    setLoading(false);
  };

  const addAdditionalUser = () => {
    if (!newUserEmail) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      toast.error("Invalid email address");
      return;
    }

    if (additionalUsers.includes(newUserEmail)) {
      toast.error("Email already added");
      return;
    }

    setAdditionalUsers([...additionalUsers, newUserEmail]);
    setNewUserEmail("");
  };

  const removeAdditionalUser = (email: string) => {
    setAdditionalUsers(additionalUsers.filter(e => e !== email));
  };

  const sendInvitation = async () => {
    try {
      const validatedData = labelInvitationSchema.parse(formData);

      // Check if master account already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", validatedData.master_account_email)
        .maybeSingle();

      if (existingProfile) {
        toast.error("An account with this email already exists");
        return;
      }

      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from("label_invitations")
        .insert({
          label_name: validatedData.label_name,
          master_account_email: validatedData.master_account_email,
          additional_users: additionalUsers,
          subscription_tier: validatedData.subscription_tier,
          invited_by: user.id,
          status: "pending"
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-label-invitation', {
        body: {
          label_name: validatedData.label_name,
          master_email: validatedData.master_account_email,
          additional_users: additionalUsers,
          subscription_tier: validatedData.subscription_tier,
          invitation_id: invitation.id
        }
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.error("Invitation created but email failed to send");
      } else {
        toast.success("Label invitation sent successfully!");
      }

      setDialogOpen(false);
      setFormData({
        label_name: "",
        master_account_email: "",
        subscription_tier: "Trackball Signature"
      });
      setAdditionalUsers([]);
      fetchInvitations();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to send invitation");
      }
    }
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">LABEL INVITATIONS</CardTitle>
            <CardDescription>Invite labels to join Trackball Distribution</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Building2 className="w-4 h-4 mr-2" />
                Invite Label
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-bold">Invite New Label</DialogTitle>
                <DialogDescription>Send an invitation to onboard a new label</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="label_name">Label Name *</Label>
                  <Input
                    id="label_name"
                    placeholder="Enter label name"
                    value={formData.label_name}
                    onChange={(e) => setFormData({ ...formData, label_name: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="master_email">Master Account Holder Email *</Label>
                  <Input
                    id="master_email"
                    type="email"
                    placeholder="master@label.com"
                    value={formData.master_account_email}
                    onChange={(e) => setFormData({ ...formData, master_account_email: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subscription">Subscription Tier *</Label>
                  <Select
                    value={formData.subscription_tier}
                    onValueChange={(value) => setFormData({ ...formData, subscription_tier: value })}
                  >
                    <SelectTrigger id="subscription" className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="Trackball Signature">Trackball Signature</SelectItem>
                      <SelectItem value="Trackball Prestige">Trackball Prestige</SelectItem>
                      <SelectItem value="Trackball Partner">
                        <div className="flex items-center gap-2">
                          Trackball Partner
                          <Badge variant="outline" className="text-xs">Custom Deal</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Additional Label Staff/Users</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="staff@label.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addAdditionalUser()}
                      className="bg-background border-border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addAdditionalUser}
                      className="border-primary/20"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                  {additionalUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {additionalUsers.map((email) => (
                        <Badge key={email} variant="secondary" className="gap-1 pr-1">
                          {email}
                          <button
                            onClick={() => removeAdditionalUser(email)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={sendInvitation} className="w-full bg-gradient-primary hover:opacity-90">
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Label Name</TableHead>
                <TableHead>Master Account</TableHead>
                <TableHead>Additional Users</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No label invitations sent yet
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((invitation) => (
                  <TableRow key={invitation.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{invitation.label_name}</TableCell>
                    <TableCell className="text-muted-foreground">{invitation.master_account_email}</TableCell>
                    <TableCell>
                      {invitation.additional_users?.length > 0 ? (
                        <Badge variant="outline">{invitation.additional_users.length} users</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-gradient-primary text-white">
                        {invitation.subscription_tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invitation.status === "pending" && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          Pending
                        </Badge>
                      )}
                      {invitation.status === "accepted" && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          Accepted
                        </Badge>
                      )}
                      {invitation.status === "expired" && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                          Expired
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default LabelInvitationManagement;