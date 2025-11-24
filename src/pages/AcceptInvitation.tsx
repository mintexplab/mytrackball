import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { TrackballBeads } from "@/components/TrackballBeads";
import trackballLogo from "@/assets/trackball-logo.png";

const signupSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  email: z.string().email('Invalid email address').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

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
      // Validate input
      const validatedData = signupSchema.parse({
        fullName,
        email,
        password
      });
      // Create the account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: { full_name: validatedData.fullName },
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

      // Update profile with parent account and label info
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("label_name, id")
        .eq("id", invitation.inviter_id)
        .single();

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          parent_account_id: invitation.inviter_id,
          label_name: inviterProfile?.label_name || null,
          artist_name: validatedData.fullName,
        })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;

      toast.success(`Account created! You're now part of ${inviterProfile?.label_name || "the label"}!`);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message);
      }
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
                  minLength={8}
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
                className="text-primary hover:text-primary/80 transition-all duration-300 hover:scale-105"
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
