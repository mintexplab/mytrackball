import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const ArtistInvitationManagement = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState("");
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("artist_invitations")
        .select("*")
        .eq("invited_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const revokeInvitation = async (invitationId: string, inviteeEmail: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation sent to ${inviteeEmail}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("artist_invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId);

      if (error) throw error;

      toast({
        title: "Invitation revoked",
        description: `Invitation to ${inviteeEmail} has been revoked`,
      });

      fetchInvitations();
    } catch (error: any) {
      console.error("Error revoking invitation:", error);
      toast({
        title: "Error",
        description: "Failed to revoke invitation",
        variant: "destructive",
      });
    }
  };

  const accountTypes = [
    { 
      value: "artist", 
      label: "Artist Account", 
      features: [
        "90/10 royalty split (you keep 90%)",
        "Release submission and management",
        "Catalog viewing",
        "Royalties tracking",
        "Support tickets",
        "Up to 3 artist names"
      ] 
    },
    { 
      value: "label", 
      label: "Label Account", 
      features: [
        "90/10 royalty split (you keep 90%)",
        "Unlimited users",
        "Unlimited labels",
        "Full catalog management",
        "Publishing submissions",
        "Support tickets",
        "Dedicated account manager"
      ] 
    },
  ];

  const handleSendInvitation = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAccountType) {
      toast({
        title: "Account type required",
        description: "Please select an account type for the invitee",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to send invitations",
          variant: "destructive",
        });
        return;
      }

      const accountInfo = accountTypes.find(a => a.value === selectedAccountType);

      if (!accountInfo) {
        toast({
          title: "Error",
          description: "Invalid account type selection",
          variant: "destructive",
        });
        return;
      }

      // Create invitation record
      const insertData: any = {
        email,
        invited_by: user.id,
        assigned_plan_type: selectedAccountType,
        assigned_plan_name: accountInfo.label,
        plan_features: accountInfo.features,
      };

      const { data: invitationData, error: insertError } = await supabase
        .from("artist_invitations")
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Send invitation email
      const acceptUrl = `${window.location.origin}/accept-artist-invitation?token=${invitationData.id}`;

      const { error: emailError } = await supabase.functions.invoke("send-artist-invitation", {
        body: { 
          email,
          invitationId: invitationData.id,
          planType: selectedAccountType,
          planName: accountInfo.label,
          planFeatures: accountInfo.features,
          acceptUrl,
        },
      });

      if (emailError) throw emailError;

      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${email} as ${accountInfo.label}`,
      });

      setEmail("");
      setSelectedAccountType("");
      fetchInvitations();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Invite Users
          </CardTitle>
          <CardDescription>
            Send invitations to users to join My Trackball
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="user-email">User Email Address</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-type-select">Account Type</Label>
              <Select value={selectedAccountType} onValueChange={setSelectedAccountType}>
                <SelectTrigger id="account-type-select">
                  <SelectValue placeholder="Select account type..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAccountType && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-medium mb-2">Included Features:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {accountTypes
                    .find(a => a.value === selectedAccountType)
                    ?.features.map((feature, idx) => (
                      <li key={idx}>• {feature}</li>
                    ))}
                </ul>
              </div>
            )}

            <Button
              onClick={handleSendInvitation}
              disabled={loading || !email || !selectedAccountType}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sent Invitations List */}
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Sent Invitations</CardTitle>
          <CardDescription>
            Manage invitations you have sent to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvitations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No invitations sent yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium truncate">{invitation.email}</p>
                      {invitation.status === "pending" && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {invitation.status === "accepted" && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Accepted
                        </Badge>
                      )}
                      {invitation.status === "revoked" && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                          <XCircle className="w-3 h-3 mr-1" />
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-medium">{invitation.assigned_plan_name}</span>
                      <span>Sent {format(new Date(invitation.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  {invitation.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeInvitation(invitation.id, invitation.email)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArtistInvitationManagement;