import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

const ArtistInvitationManagement = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendInvitation = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to send invitations",
          variant: "destructive",
        });
        return;
      }

      // Create invitation record
      const { error: insertError } = await supabase
        .from("artist_invitations")
        .insert({
          email,
          invited_by: user.id,
        });

      if (insertError) throw insertError;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke("send-artist-invitation", {
        body: { email },
      });

      if (emailError) throw emailError;

      toast({
        title: "Invitation sent",
        description: `Artist invitation sent to ${email}`,
      });

      setEmail("");
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Invite Artists
          </CardTitle>
          <CardDescription>
            Send invitations to artists to join My Trackball
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="artist-email">Artist Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="artist-email"
                  type="email"
                  placeholder="artist@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendInvitation()}
                  disabled={loading}
                />
                <Button
                  onClick={handleSendInvitation}
                  disabled={loading || !email}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArtistInvitationManagement;
