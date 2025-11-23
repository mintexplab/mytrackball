import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Confetti } from "./Confetti";

interface SubscriptionWelcomeDialogProps {
  open: boolean;
  onClose: () => void;
  planName: string;
  planFeatures: string[];
}

const SubscriptionWelcomeDialog = ({
  open,
  onClose,
  planName,
  planFeatures
}: SubscriptionWelcomeDialogProps) => {
  return (
    <>
      {open && <Confetti active={true} />}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 rounded-full bg-gradient-primary">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              Welcome to {planName}!
            </DialogTitle>
            <DialogDescription className="text-center">
              You&apos;ve been enrolled in a new subscription plan
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Your Plan Benefits:</h3>
              <div className="space-y-3">
                {planFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button onClick={onClose} className="bg-gradient-primary hover:opacity-90">
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionWelcomeDialog;
