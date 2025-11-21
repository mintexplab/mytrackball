import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AcceptSubdistributorInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      toast.error("Invalid invitation link");
      navigate("/");
      return;
    }

    loadInvitation(token);
  }, [searchParams]);

  const loadInvitation = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from("subdistributor_invitations")
        .select(`
          *,
          subdistributor:subdistributors(name, slug)
        `)
        .eq("invitation_token", token)
        .eq("status", "pending")
        .single();

      if (error || !data) {
        toast.error("Invitation not found or has expired");
        navigate("/");
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        toast.error("This invitation has expired");
        navigate("/");
        return;
      }

      setInvitation(data);
      setEmail(data.invitee_email);
    } catch (error) {
      console.error("Error loading invitation:", error);
      toast.error("Failed to load invitation");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Update the invitation status
      const { error: updateError } = await supabase
        .from("subdistributor_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("invitation_token", searchParams.get("token"));

      if (updateError) {
        console.error("Failed to update invitation:", updateError);
      }

      // Update profile with subdistributor
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          subdistributor_id: invitation.subdistributor_id,
          full_name: fullName,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        console.error("Failed to update profile:", profileError);
      }

      // Assign subdistributor_admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "subdistributor_admin",
        });

      if (roleError) {
        console.error("Failed to assign role:", roleError);
      }

      // Update subdistributor owner
      const { error: ownerError } = await supabase
        .from("subdistributors")
        .update({ owner_id: authData.user.id })
        .eq("id", invitation.subdistributor_id);

      if (ownerError) {
        console.error("Failed to set owner:", ownerError);
      }

      toast.success("Account created successfully! Redirecting to dashboard...");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error(error.message || "Failed to accept invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Loading invitation...</p>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        backgroundColor: invitation.background_color || "#000000",
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle style={{ color: invitation.primary_color }}>
            Join {invitation.subdistributor?.name}
          </CardTitle>
          <CardDescription>
            Create your account to start managing your distribution platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAcceptInvitation} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              style={{
                backgroundColor: invitation.primary_color,
                color: "white",
              }}
            >
              {isSubmitting ? "Creating Account..." : "Accept Invitation & Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
