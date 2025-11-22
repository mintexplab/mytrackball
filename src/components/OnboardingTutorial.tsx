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
    description: "Let's take a quick tour of your dashboard to help you get started with music distribution.",
    position: "center",
    highlightElement: null,
  },
  {
    title: "Overview Tab",
    description: "This is where you'll see all your releases in a beautiful gallery view. Click on any release to view details.",
    position: "top-right",
    highlightElement: "[data-tutorial='overview-tab']",
  },
  {
    title: "Create Release",
    description: "Start here to submit new music for distribution. Fill out the form with your track details, upload artwork and audio.",
    position: "top-left",
    highlightElement: "[data-tutorial='create-release']",
  },
  {
    title: "Catalog Management",
    description: "View and manage all your releases. Search, filter by status, and export your catalog data.",
    position: "top-right",
    highlightElement: "[data-tutorial='catalog-tab']",
  },
  {
    title: "Royalties",
    description: "Track your earnings and payment history. Request payouts when you're ready.",
    position: "top-right",
    highlightElement: "[data-tutorial='royalties-tab']",
  },
  {
    title: "Account Settings",
    description: "Manage your profile, update your information, and configure your account settings.",
    position: "top-right",
    highlightElement: "[data-tutorial='profile-dropdown']",
  },
  {
    title: "You're All Set!",
    description: "That's the basics! You're ready to start distributing your music. Click finish to start using My Trackball.",
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