import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Music2, Building2 } from "lucide-react";

interface ArtistLabelOnboardingProps {
  userId: string;
  userPlan: any;
}

const ArtistLabelOnboarding = ({ userId, userPlan }: ArtistLabelOnboardingProps) => {
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [labelName, setLabelName] = useState("");

  useEffect(() => {
    checkOnboardingStatus();
  }, [userId]);

  const checkOnboardingStatus = async () => {
    // Check if user has already completed onboarding
    const { data: profile } = await supabase
      .from("profiles")
      .select("label_name")
      .eq("id", userId)
      .single();

    // If label_name is null, show the type selection dialog
    if (profile && profile.label_name === null) {
      setShowTypeDialog(true);
    }
  };

  const handleArtistSelection = async () => {
    // Set label_name to empty string for artists (not null)
    const { error } = await supabase
      .from("profiles")
      .update({ label_name: "" })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to save selection");
      return;
    }

    setShowTypeDialog(false);
    toast.success("Welcome! You're set up as an artist.");
  };

  const handleLabelSelection = () => {
    // Check if user has Signature or Prestige plan
    const planName = userPlan?.plan?.name || "";
    const hasRequiredPlan = planName === "Trackball Signature" || planName === "Trackball Prestige";

    if (!hasRequiredPlan) {
      toast.error("Label features require Trackball Signature or Prestige plan");
      setShowTypeDialog(false);
      // Set to empty string so they don't see the dialog again
      supabase
        .from("profiles")
        .update({ label_name: "" })
        .eq("id", userId);
      return;
    }

    setShowTypeDialog(false);
    setShowLabelDialog(true);
  };

  const handleLabelSubmit = async () => {
    if (!labelName.trim()) {
      toast.error("Please enter a label name");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ label_name: labelName.trim() })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to save label name");
      return;
    }

    setShowLabelDialog(false);
    setLabelName("");
    toast.success(`Welcome to Trackball! Your label "${labelName.trim()}" has been set up.`);
  };

  return (
    <>
      {/* Artist or Label Type Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="bg-card border-border" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Welcome to My Trackball</DialogTitle>
            <DialogDescription>
              Are you operating as an individual artist or a record label?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Button
              onClick={handleArtistSelection}
              className="h-32 flex flex-col gap-3 bg-muted hover:bg-muted/80 border-2 border-border hover:border-primary transition-all"
              variant="outline"
            >
              <Music2 className="w-12 h-12 text-primary" />
              <span className="text-lg font-semibold">Artist</span>
            </Button>
            <Button
              onClick={handleLabelSelection}
              className="h-32 flex flex-col gap-3 bg-muted hover:bg-muted/80 border-2 border-border hover:border-primary transition-all"
              variant="outline"
            >
              <Building2 className="w-12 h-12 text-primary" />
              <span className="text-lg font-semibold">Label</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Label Onboarding Dialog */}
      <Dialog open={showLabelDialog} onOpenChange={setShowLabelDialog}>
        <DialogContent className="bg-card border-border" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Label Setup</DialogTitle>
            <DialogDescription>
              Set up your label name. This will be displayed on your dashboard and releases.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="labelName">Label Name</Label>
              <Input
                id="labelName"
                placeholder="Enter your label name"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                className="bg-background border-border"
                maxLength={100}
              />
            </div>
            <Button 
              onClick={handleLabelSubmit} 
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              Complete Setup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ArtistLabelOnboarding;
