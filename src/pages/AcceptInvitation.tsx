import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Music2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const navigate = useNavigate();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid invitation link");
      navigate("/auth");
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from("sublabel_invitations")
        .select(`
          *,
          inviter:profiles!sublabel_invitations_inviter_id_fkey(display_name, full_name, label_name, email)
        `)
        .eq("id", token)
        .eq("status", "pending")
        .eq("invitation_type", "client")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) {
        toast.error("Invitation not found or expired");
        navigate("/auth");
        return;
      }

      setInvitation(data);
      setEmail(data.invitee_email);
    } catch (error) {
      console.error("Error fetching invitation:", error);
      toast.error("Failed to load invitation");
      navigate("/auth");
    } finally {
      setLoadingInvitation(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create the account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create account");

      // Accept the invitation
      const { error: inviteError } = await supabase
        .from("sublabel_invitations")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", token);

      if (inviteError) throw inviteError;

      // Grant permissions
      if (invitation.permissions && invitation.permissions.length > 0) {
        const permissionsToInsert = invitation.permissions.map((permission: string) => ({
          user_id: authData.user.id,
          permission: permission,
          granted_by: invitation.inviter_id,
        }));

        const { error: permError } = await supabase
          .from("user_permissions")
          .insert(permissionsToInsert);

        if (permError) throw permError;
      }

      toast.success(`Account created! You're now a client of ${invitation.inviter.label_name || invitation.inviter.display_name}!`);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-red-400/25 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>
      
      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
            <UserPlus className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              You're Invited!
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Join {invitation.inviter.label_name || invitation.inviter.display_name} on My Trackball
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-2">Invited by:</p>
            <p className="font-semibold">
              {invitation.inviter.label_name || invitation.inviter.display_name || invitation.inviter.full_name}
            </p>
            {invitation.inviter?.email && (
              <p className="text-sm text-muted-foreground">{invitation.inviter.email}</p>
            )}
            
            {invitation.permissions && invitation.permissions.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">You'll have access to:</p>
                <div className="flex flex-wrap gap-2">
                  {invitation.permissions.map((perm: string) => (
                    <Badge key={perm} variant="outline" className="bg-primary/10">
                      {perm.charAt(0).toUpperCase() + perm.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-background/50 border-border focus:border-primary transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-background/30 border-border"
              />
              <p className="text-xs text-muted-foreground">This email was invited</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-background/50 border-border focus:border-primary transition-colors"
              />
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Accept Invitation & Create Account"}
            </Button>
            
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
