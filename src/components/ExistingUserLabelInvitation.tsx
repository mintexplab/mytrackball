import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TrackballBeads } from "@/components/TrackballBeads";
import trackballLogo from "@/assets/trackball-logo.png";

export const ExistingUserLabelInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    checkInvitationAndUser();
  }, [searchParams]);

  const checkInvitationAndUser = async () => {
    const invitationId = searchParams.get("id");
    if (!invitationId) {
      toast.error("Invalid invitation link");
      navigate("/auth");
      return;
    }

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Not logged in, redirect to regular signup page
        navigate(`/accept-label-invitation?id=${invitationId}`);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserEmail(profile.email);
      }

      // Fetch invitation
      const { data, error } = await supabase
        .from("label_invitations")
        .select("*")
        .eq("id", invitationId)
        .single();

      if (error || !data) {
        toast.error("Invitation not found or expired");
        navigate("/dashboard");
        return;
      }

      if (data.status !== "pending") {
        toast.error("This invitation has already been used or expired");
        navigate("/dashboard");
        return;
      }

      // Check if invitation is expired
      if (new Date(data.expires_at) < new Date()) {
        toast.error("This invitation has expired");
        navigate("/dashboard");
        return;
      }

      // Check if invitation matches user's email
      const isForThisUser = 
        profile?.email === data.master_account_email ||
        data.additional_users?.includes(profile?.email);

      if (!isForThisUser) {
        toast.error("This invitation is not for your email address");
        navigate("/dashboard");
        return;
      }

      setInvitation(data);
    } catch (error) {
      console.error("Error checking invitation:", error);
      toast.error("Failed to load invitation");
      navigate("/dashboard");
    } finally {
      setChecking(false);
    }
  };

  const handleAccept = async () => {
    if (!invitation) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('accept-additional-label-invitation', {
        body: { invitationId: invitation.id }
      });

      if (error) throw error;

      toast.success(`Successfully joined ${invitation.label_name}!`);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error(error.message || "Failed to accept invitation");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const isOwner = userEmail === invitation.master_account_email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <TrackballBeads />
      </div>
      
      <Card 
        className="w-full max-w-md relative backdrop-blur-sm bg-black border-primary/30"
        style={{
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.3), 0 0 80px rgba(239, 68, 68, 0.15)'
        }}
      >
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow overflow-hidden">
            <img src={trackballLogo} alt="Trackball Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <CardTitle className="text-3xl bg-gradient-primary bg-clip-text text-transparent font-normal font-sans text-center">
              Join {invitation.label_name}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              You've been invited to join this label
            </CardDescription>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge className="bg-gradient-primary text-white">
              {invitation.subscription_tier}
            </Badge>
            {isOwner && (
              <Badge variant="outline" className="border-primary/30">
                Master Account
              </Badge>
            )}
            {invitation.subscription_tier === "Label Partner" && invitation.custom_royalty_split && (
              <Badge variant="outline" className="border-primary/30">
                {invitation.custom_royalty_split}% Royalty Split
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Label Name</p>
                <p className="text-sm text-muted-foreground">{invitation.label_name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Your Role</p>
                <p className="text-sm text-muted-foreground">
                  {isOwner ? "Master Account Owner" : "Label Member"}
                </p>
              </div>
            </div>
            {invitation.service_access && invitation.service_access.length > 0 && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Service Access</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {invitation.service_access.map((service: string) => (
                      <Badge key={service} variant="secondary" className="text-xs">
                        {service.charAt(0).toUpperCase() + service.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAccept}
              disabled={loading}
              className="w-full bg-gradient-primary hover:opacity-90 text-white"
            >
              {loading ? "Accepting..." : "Accept Invitation"}
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
