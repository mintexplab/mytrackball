import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

interface LabelInvitation {
  id: string;
  label_name: string;
  master_account_email: string;
  additional_users: string[];
  subscription_tier: string;
  service_access: string[] | null;
  custom_royalty_split: number | null;
  expires_at: string;
  created_at: string;
  status: string;
}

export default function PendingLabelInvitations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationIdFromUrl = searchParams.get("id");
  
  const [invitations, setInvitations] = useState<LabelInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get user's profile to get their email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      if (!profile) {
        toast.error("Could not load user profile");
        return;
      }

      setUserEmail(profile.email);

      // Fetch all pending invitations where user's email matches
      const { data: invites, error } = await supabase
        .from("label_invitations")
        .select("*")
        .eq("status", "pending")
        .or(`master_account_email.eq.${profile.email},additional_users.cs.{${profile.email}}`)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      setInvitations(invites || []);
      
      // If there's an invitation ID in URL, scroll to it or highlight it
      if (invitationIdFromUrl && invites) {
        const invitation = invites.find(inv => inv.id === invitationIdFromUrl);
        if (invitation) {
          // Auto-focus on this invitation
          setTimeout(() => {
            document.getElementById(`invitation-${invitationIdFromUrl}`)?.scrollIntoView({ 
              behavior: "smooth", 
              block: "center" 
            });
          }, 100);
        }
      }
    } catch (error: any) {
      console.error("Error fetching invitations:", error);
      toast.error(error.message || "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const handleAccept = async (invitationId: string) => {
    try {
      setAcceptingId(invitationId);

      const { error } = await supabase.functions.invoke("accept-additional-label-invitation", {
        body: { invitationId }
      });

      if (error) throw error;

      toast.success("Label invitation accepted successfully!");
      
      // Refresh invitations list
      await fetchInvitations();
      
      // Reload page to update label context
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error(error.message || "Failed to accept invitation");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (invitationId: string) => {
    try {
      setRejectingId(invitationId);

      const { error } = await supabase.functions.invoke("reject-label-invitation", {
        body: { invitationId }
      });

      if (error) throw error;

      toast.success("Invitation rejected");
      await fetchInvitations();
    } catch (error: any) {
      console.error("Error rejecting invitation:", error);
      toast.error(error.message || "Failed to reject invitation");
    } finally {
      setRejectingId(null);
    }
  };

  const getUserRole = (invitation: LabelInvitation): string => {
    return invitation.master_account_email === userEmail ? "Master Account Owner" : "Label Member";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Label Invitations</h1>
            <p className="text-muted-foreground mt-1">
              Accept pending invitations to join label accounts
            </p>
          </div>
        </div>

        {invitations.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Pending Invitations
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                You don't have any pending label invitations at the moment. 
                Accepted or expired invitations will not appear here.
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                className="mt-6"
                variant="outline"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <Card 
                key={invitation.id} 
                id={`invitation-${invitation.id}`}
                className={`border-border bg-card transition-all ${
                  invitation.id === invitationIdFromUrl ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl text-foreground">
                        {invitation.label_name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        You've been invited to join this label account
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {invitation.subscription_tier}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Your Role</p>
                      <p className="text-foreground font-medium">{getUserRole(invitation)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Invitation Expires</p>
                      <p className="text-foreground font-medium">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </div>

                    {invitation.custom_royalty_split !== null && (
                      <div>
                        <p className="text-sm text-muted-foreground">Custom Royalty Split</p>
                        <p className="text-foreground font-medium">
                          {invitation.custom_royalty_split}% to artist
                        </p>
                      </div>
                    )}

                    {invitation.service_access && invitation.service_access.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground mb-2">Services Access</p>
                        <div className="flex flex-wrap gap-2">
                          {invitation.service_access.map((service) => (
                            <Badge key={service} variant="secondary">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Button
                      onClick={() => handleAccept(invitation.id)}
                      disabled={acceptingId === invitation.id || rejectingId === invitation.id}
                      className="flex-1"
                    >
                      {acceptingId === invitation.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        "Accept Invitation"
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(invitation.id)}
                      disabled={acceptingId === invitation.id || rejectingId === invitation.id}
                    >
                      {rejectingId === invitation.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        "Reject"
                      )}
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
}
