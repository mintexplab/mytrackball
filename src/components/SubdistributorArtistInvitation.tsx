import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UserPlus, Mail } from "lucide-react";

export const SubdistributorArtistInvitation = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const handleInviteArtist = async () => {
    if (!email.trim() || !fullName.trim()) {
      toast.error("Please provide both email and full name");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user is subdistributor master
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_subdistributor_master")
        .eq("id", user.id)
        .single();

      if (!profile?.is_subdistributor_master) {
        throw new Error("Only subdistributor masters can invite artists");
      }

      // Check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from("artist_invitations")
        .select("id")
        .eq("email", email.trim())
        .eq("invited_by", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (existingInvitation) {
        toast.error("An invitation has already been sent to this email");
        return;
      }

      // Create invitation
      const { error: invitationError } = await supabase
        .from("artist_invitations")
        .insert({
          email: email.trim(),
          invited_by: user.id,
          status: "pending",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        });

      if (invitationError) throw invitationError;

      // Send invitation email via edge function
      const { data: { session } } = await supabase.auth.getSession();
      const { error: emailError } = await supabase.functions.invoke('send-artist-invitation', {
        body: { 
          email: email.trim(),
          inviterName: fullName.trim()
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.warning("Invitation created but email failed to send");
      } else {
        toast.success(`Invitation sent to ${email}`);
      }

      // Reset form
      setEmail("");
      setFullName("");
    } catch (error: any) {
      console.error("Error inviting artist:", error);
      toast.error(error.message || "Failed to invite artist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-primary" />
          Invite Artists
        </CardTitle>
        <CardDescription>
          Invite artists to join your distribution platform. They'll receive a regular artist account with your custom branding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Artist Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="bg-background/50 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Artist Email</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="artist@example.com"
                  className="bg-background/50 border-border pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleInviteArtist}
          disabled={loading || !email.trim() || !fullName.trim()}
          className="w-full bg-gradient-primary hover:opacity-90"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Invitation...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Send Invitation
            </>
          )}
        </Button>

        <div className="p-4 rounded-lg bg-muted/20 border border-border">
          <h3 className="font-semibold text-sm mb-2">What happens next?</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Artist receives an invitation email</li>
            <li>They create an account linked to your platform</li>
            <li>They see your custom branding (logo, colors, dashboard name)</li>
            <li>They can distribute music as a regular artist</li>
            <li>You manage QC and approval for their releases</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};