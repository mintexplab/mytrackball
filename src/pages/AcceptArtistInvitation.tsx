import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { TrackballBeads } from "@/components/TrackballBeads";
import trackballLogo from "@/assets/trackball-logo.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const AcceptArtistInvitation = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
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
        .from("artist_invitations")
        .select("*")
        .eq("id", token)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data) {
        toast.error("Invitation not found or expired");
        navigate("/auth");
        return;
      }

      setInvitation(data);
      setEmail(data.email);
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
      const validatedData = signupSchema.parse({ fullName, email, password });

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

      await processInvitationAcceptance(authData.user.id, validatedData.fullName);

      toast.success("Account created successfully!");
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = loginSchema.parse({ email: loginEmail, password: loginPassword });

      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (loginError) throw loginError;
      if (!authData.user) throw new Error("Login failed");

      // Check if email matches invitation
      if (authData.user.email !== invitation.email) {
        toast.error("This invitation was sent to a different email address");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      await processInvitationAcceptance(authData.user.id);

      toast.success("Invitation accepted!");
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

  const processInvitationAcceptance = async (userId: string, name?: string) => {
    // Mark invitation as accepted
    const { error: inviteError } = await supabase
      .from("artist_invitations")
      .update({ 
        status: "accepted",
        accepted_at: new Date().toISOString()
      })
      .eq("id", token);

    if (inviteError) throw inviteError;

    // Assign plan based on invitation
    if (invitation.assigned_plan_type === "label_designation") {
      // Assign label designation
      const labelTypeMap: Record<string, string> = {
        "Label Free": "free",
        "Label Lite": "lite",
        "Label Signature": "signature_label",
        "Label Prestige": "prestige_label",
        "Label Partner": "partner_label",
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          label_type: labelTypeMap[invitation.assigned_plan_name] || invitation.assigned_plan_name.toLowerCase().replace(' ', '_'),
          artist_name: name || null,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Save royalty split if Partner Label
      if (invitation.assigned_plan_name === "Label Partner" && invitation.royalty_split_percentage !== null) {
        await supabase
          .from("partner_royalty_splits")
          .upsert({
            user_id: userId,
            royalty_split_percentage: invitation.royalty_split_percentage,
          });
      }
    } else if (invitation.assigned_plan_type === "artist_plan") {
      // Assign artist plan
      const planMapping: Record<string, string> = {
        "Trackball Free": "Trackball Free",
        "Trackball Lite": "Trackball Lite",
        "Trackball Signature": "Trackball Signature",
        "Trackball Prestige": "Trackball Prestige",
      };

      const planName = planMapping[invitation.assigned_plan_name];
      
      if (planName) {
        const { data: plan } = await supabase
          .from("plans")
          .select("id")
          .eq("name", planName)
          .single();

        if (plan) {
          await supabase
            .from("user_plans")
            .upsert({
              user_id: userId,
              plan_id: plan.id,
              plan_name: planName,
              status: "active",
            });
        }
      }

      if (name) {
        await supabase
          .from("profiles")
          .update({ artist_name: name })
          .eq("id", userId);
      }
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

  const isLabelPartner = invitation.assigned_plan_type === "label_designation";

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
              {invitation.assigned_plan_type === "label_designation" && invitation.assigned_plan_name === "Label Partner" && invitation.royalty_split_percentage !== null
                ? `As per your contract, you will be invited as a Label Partner with a ${invitation.royalty_split_percentage}/${100 - invitation.royalty_split_percentage} royalty split. This grants you:`
                : invitation.assigned_plan_type === "label_designation"
                ? `As per your contract, you will be invited as a ${invitation.assigned_plan_name}. This grants you:`
                : `Trackball Distribution has invited you to create an account on My Trackball. You have been assigned ${invitation.assigned_plan_name} based on the plan you have purchased.`
              }
            </CardDescription>
            <Badge className="mt-3 bg-primary/20 text-primary border-primary/30">
              Plan: {invitation.assigned_plan_name}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium mb-2">
              {invitation.assigned_plan_type === "label_designation" ? "Your included features:" : "Your included services are:"}
            </p>
            <ul className="space-y-1">
              {invitation.plan_features?.map((feature: string, idx: number) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {invitation.royalty_split_percentage !== null && invitation.assigned_plan_name === "Label Partner" && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm">
                  <span className="font-medium">Royalty Split:</span>{" "}
                  <span className="text-primary">{invitation.royalty_split_percentage}%</span> (Artist) / 
                  <span className="text-primary"> {100 - invitation.royalty_split_percentage}%</span> (Label)
                </p>
              </div>
            )}
          </div>

          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Create Account</TabsTrigger>
              <TabsTrigger value="login">I have an account</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
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
              </form>
            </TabsContent>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="loginEmail">Email</Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="bg-background/50 border-border focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="loginPassword">Password</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="bg-background/50 border-border focus:border-primary transition-colors"
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login & Accept Invitation"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptArtistInvitation;
