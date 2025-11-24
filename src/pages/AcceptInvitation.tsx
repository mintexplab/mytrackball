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
import { useBrandingData, BrandingContext } from "@/hooks/useBrandingContext";
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
  const [inviterAccentColor, setInviterAccentColor] = useState<string>("#ef4444");
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const branding = useBrandingData();

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
      // First try to find it in sublabel_invitations (client type)
      const { data: sublabelData, error: sublabelError } = await supabase
        .from("sublabel_invitations")
        .select(`
          *,
          inviter:profiles!sublabel_invitations_inviter_id_fkey(display_name, full_name, label_name, email, subdistributor_accent_color, is_subdistributor_master)
        `)
        .eq("id", token)
        .eq("status", "pending")
        .eq("invitation_type", "client")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (sublabelData) {
        setInvitation({ ...sublabelData, type: 'sublabel' });
        setEmail(sublabelData.invitee_email);
        
        // Set inviter's accent color if they're a subdistributor
        if (sublabelData.inviter?.is_subdistributor_master && sublabelData.inviter?.subdistributor_accent_color) {
          setInviterAccentColor(sublabelData.inviter.subdistributor_accent_color);
        }
        setLoadingInvitation(false);
        return;
      }

      // If not found in sublabel_invitations, try artist_invitations
      const { data: artistData, error: artistError } = await supabase
        .from("artist_invitations")
        .select("*")
        .eq("id", token)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (artistData) {
        // Fetch inviter profile separately
        const { data: inviterProfile } = await supabase
          .from("profiles")
          .select("display_name, full_name, label_name, email, subdistributor_accent_color, is_subdistributor_master")
          .eq("id", artistData.invited_by)
          .single();

        setInvitation({ ...artistData, type: 'artist', inviter: inviterProfile });
        setEmail(artistData.email);
        
        // Set inviter's accent color if they're a subdistributor
        if (inviterProfile?.is_subdistributor_master && inviterProfile?.subdistributor_accent_color) {
          setInviterAccentColor(inviterProfile.subdistributor_accent_color);
        }
        setLoadingInvitation(false);
        return;
      }

      // If not found in either table
      toast.error("Invitation not found or expired");
      navigate("/auth");
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

      // Accept the invitation based on type
      if (invitation.type === 'sublabel') {
        const { error: inviteError } = await supabase
          .from("sublabel_invitations")
          .update({ 
            status: "accepted",
            accepted_at: new Date().toISOString()
          })
          .eq("id", token);

        if (inviteError) throw inviteError;

        // Grant permissions for sublabel invitations
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
      } else {
        // Artist invitation
        const { error: inviteError } = await supabase
          .from("artist_invitations")
          .update({ 
            status: "accepted",
            accepted_at: new Date().toISOString()
          })
          .eq("id", token);

        if (inviteError) throw inviteError;
      }

      // Update profile with parent account and label info
      const inviterId = invitation.type === 'sublabel' ? invitation.inviter_id : invitation.invited_by;
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("label_name, id")
        .eq("id", inviterId)
        .single();

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          parent_account_id: inviterId,
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
    <BrandingContext.Provider value={branding}>
      <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <TrackballBeads />
      </div>
      
      <Card 
        className="w-full max-w-md relative backdrop-blur-sm bg-black"
        style={{
          borderColor: `${inviterAccentColor}30`,
          boxShadow: `0 0 40px ${inviterAccentColor}30, 0 0 80px ${inviterAccentColor}15`
        }}
      >
        <CardHeader className="space-y-4 text-center">
          <div 
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${inviterAccentColor}, ${inviterAccentColor}dd)`,
              boxShadow: `0 0 30px ${inviterAccentColor}40`
            }}
          >
            <img src={trackballLogo} alt="Trackball Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <CardTitle 
              className="text-3xl bg-clip-text text-transparent font-normal font-sans text-center"
              style={{
                backgroundImage: `linear-gradient(135deg, ${inviterAccentColor}, ${inviterAccentColor}dd)`,
              }}
            >
              You're Invited!
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Join {invitation.inviter.label_name || invitation.inviter.display_name} on {branding.dashboardName}
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
            
            {invitation.type === 'sublabel' && invitation.permissions && invitation.permissions.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">You'll have access to:</p>
                <div className="flex flex-wrap gap-2">
                  {invitation.permissions.map((perm: string) => (
                    <Badge 
                      key={perm} 
                      variant="outline" 
                      style={{
                        backgroundColor: `${inviterAccentColor}10`,
                        borderColor: `${inviterAccentColor}30`
                      }}
                    >
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
                className="bg-background/50 border-border transition-colors"
                style={{
                  '--focus-color': inviterAccentColor
                } as React.CSSProperties}
                onFocus={(e) => e.currentTarget.style.borderColor = inviterAccentColor}
                onBlur={(e) => e.currentTarget.style.borderColor = ''}
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
                  className="bg-background/50 border-border transition-colors"
                  style={{
                    '--focus-color': inviterAccentColor
                  } as React.CSSProperties}
                  onFocus={(e) => e.currentTarget.style.borderColor = inviterAccentColor}
                  onBlur={(e) => e.currentTarget.style.borderColor = ''}
              />
            </div>
            
            <Button
              type="submit"
              className="w-full hover:opacity-90 transition-opacity"
              disabled={loading}
              style={{
                background: `linear-gradient(135deg, ${inviterAccentColor}, ${inviterAccentColor}dd)`,
                boxShadow: `0 0 30px ${inviterAccentColor}40`
              }}
            >
              {loading ? "Creating Account..." : "Accept Invitation & Create Account"}
            </Button>
            
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="transition-all duration-300 hover:scale-105"
                style={{ color: inviterAccentColor }}
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </BrandingContext.Provider>
  );
};

export default AcceptInvitation;
