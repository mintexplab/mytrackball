import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, X, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const tutorialSteps = [
  {
    title: "Welcome to My Trackball",
    description: "Welcome to your music distribution dashboard! Let's take a comprehensive tour of all the features available to help you succeed. You can skip this tutorial at any time by clicking the X button, or restart it later from your account settings.",
    position: "center",
    highlightElement: null,
  },
  {
    title: "Overview Tab - Your Release Gallery",
    description: "This is your command center! Here you'll see all your releases displayed in a beautiful gallery format. Each release shows your artwork, title, artist name, and release date. Click on any release to view its full details, track distribution status, and manage it.",
    position: "top-right",
    highlightElement: "[data-tutorial='overview-tab']",
  },
  {
    title: "Create Release - Submit Your Music",
    description: "Ready to distribute? Click here to submit new music. Our multi-step wizard walks you through: submission details, artwork upload, audio files, metadata (release dates, languages), contributors (composers, producers), and additional notes. Don't worry - your progress auto-saves!",
    position: "top-left",
    highlightElement: "[data-tutorial='create-release']",
  },
  {
    title: "Bulk Upload - Submit Multiple Releases",
    description: "Managing multiple releases? Use our bulk uploader! Upload a CSV file with all your release metadata, then match your audio files and artwork. Perfect for labels or prolific artists distributing entire catalogs efficiently.",
    position: "top-right",
    highlightElement: "[data-tutorial='bulk-upload']",
  },
  {
    title: "Catalog Management - Advanced Tools",
    description: "Your catalog hub! Search releases, filter by status (pending, approved, delivering, taken down) or genre, select multiple releases for bulk actions (export, takedown, archive), and view detailed information. Everything you need to manage your music catalog in one place.",
    position: "top-right",
    highlightElement: "[data-tutorial='catalog-tab']",
  },
  {
    title: "Royalties - Track Your Earnings",
    description: "Follow the money! View your total earnings, payment history, and royalty breakdowns. When you're ready, request payouts directly from this tab. Track which releases are generating revenue and monitor your collaborator splits.",
    position: "top-right",
    highlightElement: "[data-tutorial='royalties-tab']",
  },
  {
    title: "Publishing - Rights Management",
    description: "Prestige members can submit songs for publishing and PRO tracking here. Manage your songwriting credits, publishers, shareholders, and performance splits. Submit alternate titles, ISRCs, and track publishing status (sent to PRO or declined).",
    position: "top-right",
    highlightElement: "[data-tutorial='publishing-tab']",
  },
  {
    title: "Clients - Invite Your Team",
    description: "Signature and Prestige members can invite collaborators! Grant granular permissions across five categories: Catalog, Royalties, Announcements, Support, and Settings. Perfect for labels managing multiple artists or artists working with managers.",
    position: "top-right",
    highlightElement: "[data-tutorial='clients-tab']",
  },
  {
    title: "Notifications - Stay Updated",
    description: "Never miss important updates! Check here for announcements, plan changes, release status updates, and system notifications. Your communication hub for everything happening with your account and releases.",
    position: "top-right",
    highlightElement: "[data-tutorial='notifications-tab']",
  },
  {
    title: "Help & Documentation",
    description: "Stuck on something? Visit the Help tab for comprehensive guides on every feature: release submissions, bulk uploads, catalog management, royalties, publishing, and troubleshooting. Plus quick access to email support at contact@trackball.cc.",
    position: "top-right",
    highlightElement: "[data-tutorial='help-tab']",
  },
  {
    title: "Account & Profile Settings",
    description: "Click your profile icon here to access account settings. Update your name, label name (Signature/Prestige), upload a profile picture, set your timezone, change password, manage your subscription plan, and restart this tutorial anytime.",
    position: "top-right",
    highlightElement: "[data-tutorial='profile-dropdown']",
  },
  {
    title: "You're All Set!",
    description: "Congratulations! You're now ready to start distributing your music to the world. Remember, you can always restart this tutorial from your account settings if you need a refresher. Welcome to My Trackball - let's get your music heard!",
    position: "center",
    highlightElement: null,
  },
];

export const OnboardingTutorial = ({ onComplete, onSkip }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<any>({});

  useEffect(() => {
    updateHighlight();
  }, [currentStep]);

  const updateHighlight = () => {
    const step = tutorialSteps[currentStep];
    if (step.highlightElement) {
      const element = document.querySelector(step.highlightElement);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightStyle({
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
        });
      }
    }
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", user.id);
      }
      toast.success("Tutorial completed!");
      onComplete();
    } catch (error) {
      console.error("Error completing tutorial:", error);
      onComplete();
    }
  };

  const handleSkip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", user.id);
      }
      onSkip();
    } catch (error) {
      console.error("Error skipping tutorial:", error);
      onSkip();
    }
  };

  const step = tutorialSteps[currentStep];
  const isCenter = step.position === "center";

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/80 pointer-events-auto" />
      
      {/* Highlight circle for specific elements */}
      {step.highlightElement && highlightStyle.width && (
        <div
          className="absolute rounded-lg border-4 border-primary shadow-glow transition-all duration-500 pointer-events-none"
          style={highlightStyle}
        />
      )}
      
      {/* Tutorial card */}
      <div
        className={`absolute pointer-events-auto transition-all duration-500 ${
          isCenter
            ? "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            : step.position === "top-right"
            ? "top-24 right-8"
            : "top-24 left-8"
        }`}
      >
        <Card className="w-[400px] border-primary/30 bg-card shadow-glow">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? "w-8 bg-primary"
                      : index < currentStep
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {tutorialSteps.length}
              </span>
              <Button
                onClick={handleNext}
                className="bg-gradient-primary hover:opacity-90"
              >
                {currentStep === tutorialSteps.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};