import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ArtistInvitationManagement = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [assignmentType, setAssignmentType] = useState<"artist_plan" | "label_designation">("artist_plan");
  const [selectedPlan, setSelectedPlan] = useState("");
  const { toast } = useToast();

  const artistPlans = [
    { value: "trackball_free", label: "Trackball Free", features: ["Basic release management", "Release submission", "Catalog viewing"] },
    { value: "trackball_lite", label: "Trackball Lite", features: ["Basic release management", "Release submission", "Catalog viewing"] },
    { value: "trackball_signature", label: "Trackball Signature", features: ["Basic release management", "Release submission", "Catalog viewing", "Support tickets", "Dedicated account manager"] },
    { value: "trackball_prestige", label: "Trackball Prestige", features: ["Up to 3 users", "Publishing submissions", "Basic release management", "Release submission", "Catalog viewing", "Up to 1 label (no branding)", "Support tickets", "Dedicated account manager"] },
  ];

  const labelDesignations = [
    { value: "free", label: "Label Free", features: ["Max 1 user", "Max 1 label", "Basic release management", "Release submission", "Catalog viewing"] },
    { value: "lite", label: "Label Lite", features: ["Max 2 users", "Max 1 label", "Basic release management", "Release submission", "Catalog viewing"] },
    { value: "signature_label", label: "Label Signature", features: ["Max 2 users", "Max 2 labels", "Basic release management", "Release submission", "Catalog viewing", "Support tickets", "Dedicated account manager"] },
    { value: "prestige_label", label: "Label Prestige", features: ["Unlimited users", "Unlimited labels", "Publishing submissions", "Full catalog management", "Support tickets", "Dedicated account manager", "Label customization & branding"] },
    { value: "partner_label", label: "Label Partner", features: ["Unlimited users", "Unlimited labels", "Publishing submissions", "Full catalog management", "Support tickets", "Dedicated account manager", "Label customization & branding", "Custom royalty split arrangement"] },
  ];

  const handleSendInvitation = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPlan) {
      toast({
        title: "Plan selection required",
        description: "Please select a plan or designation for the invitee",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to send invitations",
          variant: "destructive",
        });
        return;
      }

      const allPlans = [...artistPlans, ...labelDesignations];
      const planInfo = allPlans.find(p => p.value === selectedPlan);

      if (!planInfo) {
        toast({
          title: "Error",
          description: "Invalid plan selection",
          variant: "destructive",
        });
        return;
      }

      // Create invitation record
      const { data: invitationData, error: insertError } = await supabase
        .from("artist_invitations")
        .insert({
          email,
          invited_by: user.id,
          assigned_plan_type: assignmentType,
          assigned_plan_name: planInfo.label,
          plan_features: planInfo.features,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke("send-artist-invitation", {
        body: { 
          email,
          invitationId: invitationData.id,
          planType: assignmentType,
          planName: planInfo.label,
          planFeatures: planInfo.features,
        },
      });

      if (emailError) throw emailError;

      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${email} with ${planInfo.label}`,
      });

      setEmail("");
      setSelectedPlan("");
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
            Invite Users
          </CardTitle>
          <CardDescription>
            Send invitations to users to join My Trackball with pre-assigned plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="user-email">User Email Address</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-4">
              <Label>Assignment Type</Label>
              <RadioGroup value={assignmentType} onValueChange={(value: any) => {
                setAssignmentType(value);
                setSelectedPlan("");
              }}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="artist_plan" id="artist_plan" />
                  <Label htmlFor="artist_plan" className="font-normal cursor-pointer">
                    Artist Subscription Plan
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="label_designation" id="label_designation" />
                  <Label htmlFor="label_designation" className="font-normal cursor-pointer">
                    Label Designation (Partner Deal)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-select">
                {assignmentType === "artist_plan" ? "Select Artist Plan" : "Select Label Designation"}
              </Label>
              <Select key={assignmentType} value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger id="plan-select">
                  <SelectValue placeholder={assignmentType === "artist_plan" ? "Choose a plan..." : "Choose a designation..."} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {assignmentType === "artist_plan" ? (
                    artistPlans.map((plan) => (
                      <SelectItem key={plan.value} value={plan.value}>
                        {plan.label}
                      </SelectItem>
                    ))
                  ) : (
                    labelDesignations.map((designation) => (
                      <SelectItem key={designation.value} value={designation.value}>
                        {designation.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-medium mb-2">Included Features:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {[...artistPlans, ...labelDesignations]
                    .find(p => p.value === selectedPlan)
                    ?.features.map((feature, idx) => (
                      <li key={idx}>• {feature}</li>
                    ))}
                </ul>
              </div>
            )}

            <Button
              onClick={handleSendInvitation}
              disabled={loading || !email || !selectedPlan}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArtistInvitationManagement;
