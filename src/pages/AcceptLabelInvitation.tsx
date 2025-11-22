import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export default function AcceptLabelInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!invitationId) {
      toast.error("Invalid invitation link");
      navigate("/auth");
      return;
    }
    fetchInvitation();
  }, [invitationId]);
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
    
    try {
      setSubmitting(true);

      // Validate form data
      const validated = signupSchema.parse(formData);

      // Check if email matches invitation
      const isValidEmail = 
        validated.email === invitation.master_account_email ||
        invitation.additional_users?.includes(validated.email);

      if (!isValidEmail) {
        toast.error("This email doesn't match the invitation");
        return;
      }

      // Create auth account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: validated.fullName,
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create account");

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          user_id: authData.user.id,
          email: validated.email,
          full_name: validated.fullName,
        });

      if (profileError) throw profileError;

      // Get or create label
      let { data: labelData } = await supabase
        .from("labels")
        .select("id")
        .eq("name", invitation.label_name)
        .maybeSingle();

      let labelId = labelData?.id;

      if (!labelId) {
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

      // Create label membership
      const isOwner = validated.email === invitation.master_account_email;
      const { error: membershipError } = await supabase
        .from("user_label_memberships")
        .insert({
          user_id: authData.user.id,
          label_id: labelId,
          label_name: invitation.label_name,
          role: invitation.invited_role || (isOwner ? 'owner' : 'member'),
        });

      if (membershipError) throw membershipError;

      // Update profile with label info
      await supabase
        .from("profiles")
        .update({
          label_id: labelId,
          label_name: invitation.label_name,
          active_label_id: labelId,
        })
        .eq("id", authData.user.id);

      // If owner of partner tier, assign plan and royalty split
      if (isOwner && invitation.subscription_tier === "Trackball Partner") {
        const { data: planData } = await supabase
          .from("plans")
          .select("id, name")
          .eq("name", "Trackball Partner")
          .single();

        if (planData) {
          await supabase
            .from("user_plans")
            .insert({
              user_id: authData.user.id,
              plan_id: planData.id,
              plan_name: planData.name,
              status: "active",
            });
        }

        if (invitation.custom_royalty_split) {
          await supabase
            .from("partner_royalty_splits")
            .insert({
              user_id: authData.user.id,
              royalty_split_percentage: invitation.custom_royalty_split,
            });
        }
      } else if (isOwner) {
        // Assign the subscription tier plan for non-partner tiers
        const { data: planData } = await supabase
          .from("plans")
          .select("id, name")
          .eq("name", invitation.subscription_tier)
          .single();

        if (planData) {
          await supabase
            .from("user_plans")
            .insert({
              user_id: authData.user.id,
              plan_id: planData.id,
              plan_name: planData.name,
              status: "active",
            });
        }
      }

      // Mark invitation as accepted
      await supabase
        .from("label_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitationId);

      toast.success(`Welcome to ${invitation.label_name}!`);
      
      // Sign in the user
      await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error accepting invitation:", error);
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-2">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Join {invitation.label_name}
          </CardTitle>
          <CardDescription>
            You've been invited to join {invitation.label_name} on Trackball Distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Label</span>
              <span className="text-foreground font-medium">{invitation.label_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subscription</span>
              <span className="text-primary font-medium">{invitation.subscription_tier}</span>
            </div>
            {invitation.custom_royalty_split && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Royalty Split</span>
                <span className="text-foreground font-medium">{invitation.custom_royalty_split}%</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Accept & Create Account"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <a href="/auth" className="text-primary hover:underline">
              Sign in here
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}