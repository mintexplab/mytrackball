import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { TrackballBeads } from "@/components/TrackballBeads";
import trackballLogo from "@/assets/trackball-logo.png";

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

const AcceptLabelInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    const invitationId = searchParams.get("id");
    if (!invitationId) {
      toast.error("Invalid invitation link");
      navigate("/auth");
      return;
    }

    fetchInvitation(invitationId);
  }, [searchParams, navigate]);

  const fetchInvitation = async (invitationId: string) => {
    try {
      const { data, error } = await supabase
        .from("label_invitations")
        .select("*")
        .eq("id", invitationId)
        .single();

      if (error || !data) {
        toast.error("Invitation not found or expired");
        navigate("/auth");
        return;
      }

      if (data.status !== "pending") {
        toast.error("This invitation has already been used or expired");
        navigate("/auth");
        return;
      }

      // Check if invitation is expired
      if (new Date(data.expires_at) < new Date()) {
        toast.error("This invitation has expired");
        navigate("/auth");
        return;
      }

      setInvitation(data);
      // Pre-fill email if this is for master account
      setFormData(prev => ({ ...prev, email: data.master_account_email }));
    } catch (error) {
      console.error("Error fetching invitation:", error);
      toast.error("Failed to load invitation");
      navigate("/auth");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = signupSchema.parse(formData);

      // Check if email matches invitation
      if (validatedData.email !== invitation.master_account_email && 
          !invitation.additional_users?.includes(validatedData.email)) {
        toast.error("Email does not match invitation");
        setLoading(false);
        return;
      }

      // Create auth account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            full_name: validatedData.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create account");

      // Get the plan ID for the subscription tier
      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("id, name")
        .eq("name", invitation.subscription_tier)
        .single();

      if (planError) throw planError;

      // Create or get label
      const { data: labelData, error: labelError } = await supabase
        .from("labels")
        .select("id")
        .eq("name", invitation.label_name)
        .maybeSingle();

      let labelId = labelData?.id;

      if (!labelId) {
        // Create new label
        const { data: newLabel, error: createLabelError } = await supabase
          .from("labels")
          .insert({
            name: invitation.label_name,
            user_id: authData.user.id,
          })
          .select()
          .single();

        if (createLabelError) throw createLabelError;
        labelId = newLabel.id;
      }

      // Update profile with label info
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          label_name: invitation.label_name,
          label_id: labelId,
        })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;

      // Assign plan
      const { error: planAssignError } = await supabase
        .from("user_plans")
        .insert({
          user_id: authData.user.id,
          plan_id: planData.id,
          plan_name: planData.name,
          status: "active",
        });

      if (planAssignError) throw planAssignError;

      // Mark invitation as accepted
      const { error: updateInviteError } = await supabase
        .from("label_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      if (updateInviteError) throw updateInviteError;

      toast.success("Account created successfully! Welcome to Trackball!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
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
              Join {invitation.label_name}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              You've been invited to join as a label member
            </CardDescription>
          </div>
          <div className="flex justify-center gap-2">
            <Badge className="bg-gradient-primary text-white">
              {invitation.subscription_tier}
            </Badge>
            {formData.email === invitation.master_account_email && (
              <Badge variant="outline" className="border-primary/30">
                Master Account
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="bg-background/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-background/50 border-border"
                readOnly={formData.email === invitation.master_account_email}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="bg-background/50 border-border"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Accept Invitation & Join"}
            </Button>

            <div className="text-center">
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

export default AcceptLabelInvitation;