import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, X, CheckCircle, Music, FolderOpen, DollarSign, HelpCircle, Bell, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
  isLabelAccount?: boolean;
}

const tutorialSteps = [
  {
    title: "Welcome to My Trackball",
    description: "Your music distribution dashboard is ready! Let's take a quick tour of the key features. You can skip anytime or restart this tutorial from Account Settings.",
    icon: Music,
    position: "center",
    highlightElement: null,
  },
  {
    title: "Dashboard Overview",
    description: "This is your home base. See your releases at a glance, quick stats, and your account manager contact info. Everything you need is organized into tabs along the top.",
    icon: FolderOpen,
    position: "top-right",
    highlightElement: "[data-tutorial='landing-tab']",
  },
  {
    title: "Create a New Release",
    description: "Click here to submit new music for distribution. Our step-by-step form guides you through artwork, audio files, metadata, and contributors. Payment is processed securely at the end.",
    icon: Music,
    position: "top-left",
    highlightElement: "[data-tutorial='create-release']",
  },
  {
    title: "Catalog Management",
    description: "View and manage all your releases in the Catalog tab. Filter by status, search, bulk select for actions, and track each release's distribution status.",
    icon: FolderOpen,
    position: "top-right",
    highlightElement: "[data-tutorial='catalog-tab']",
  },
  {
    title: "Royalties & Earnings",
    description: "Track your earnings in the Royalties tab. View your balance, payment history, and request payouts when ready. All your financial info in one place.",
    icon: DollarSign,
    position: "top-right",
    highlightElement: "[data-tutorial='royalties-tab']",
  },
  {
    title: "Notifications",
    description: "Click the bell icon to see announcements, release updates, and important messages. Stay informed about your distribution status and platform news.",
    icon: Bell,
    position: "top-right",
    highlightElement: "[data-tutorial='notifications-icon']",
  },
  {
    title: "Get Help",
    description: "Need assistance? The Help tab has documentation, guides, and access to our support ticket system. We're here to help you succeed.",
    icon: HelpCircle,
    position: "top-right",
    highlightElement: "[data-tutorial='help-tab']",
  },
  {
    title: "Your Account",
    description: "Click your profile to access Account Settings. Update your profile, manage payment methods, change your password, and configure your preferences.",
    icon: User,
    position: "top-right",
    highlightElement: "[data-tutorial='profile-dropdown']",
  },
  {
    title: "You're Ready!",
    description: "That's the essentials! Start by creating your first release or exploring the dashboard. You can restart this tutorial anytime from Account Settings. Welcome to Trackball!",
    icon: CheckCircle,
    position: "center",
    highlightElement: null,
  },
];

export const OnboardingTutorial = ({ onComplete, onSkip, isLabelAccount = false }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<any>({});

  useEffect(() => {
    const initialDelay = currentStep === 0 ? 500 : 100;
    const timer = setTimeout(() => {
      updateHighlight();
    }, initialDelay);
    
    const handleUpdate = () => updateHighlight();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [currentStep]);

  const updateHighlight = () => {
    const step = tutorialSteps[currentStep];
    if (step.highlightElement) {
      let attempts = 0;
      const maxAttempts = 10;
      
      const tryFindElement = () => {
        const element = document.querySelector(step.highlightElement);
        if (element) {
          positionHighlight(element);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(tryFindElement, 100);
        } else {
          setHighlightStyle({});
        }
      };
      
      const positionHighlight = (element: Element) => {
        const rect = element.getBoundingClientRect();
        setHighlightStyle({
          top: rect.top + window.scrollY - 8,
          left: rect.left + window.scrollX - 8,
          width: rect.width + 16,
          height: rect.height + 16,
        });
      };
      
      tryFindElement();
    } else {
      setHighlightStyle({});
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
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/80 pointer-events-auto" />
      
      {/* Highlight box for specific elements */}
      {step.highlightElement && highlightStyle.width && (
        <div
          className="absolute rounded-lg border-4 border-primary shadow-glow transition-all duration-500 pointer-events-none z-10"
          style={{
            top: `${highlightStyle.top}px`,
            left: `${highlightStyle.left}px`,
            width: `${highlightStyle.width}px`,
            height: `${highlightStyle.height}px`,
          }}
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
        <Card className="w-[380px] max-w-[90vw] border-primary/30 bg-card shadow-glow">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-lg bg-primary/10">
                  <StepIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="hover:bg-muted flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentStep
                      ? "w-6 bg-primary"
                      : index < currentStep
                      ? "w-1.5 bg-primary/50"
                      : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {currentStep + 1} / {tutorialSteps.length}
              </span>
              <Button
                onClick={handleNext}
                className="bg-gradient-primary hover:opacity-90"
              >
                {currentStep === tutorialSteps.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Get Started
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
