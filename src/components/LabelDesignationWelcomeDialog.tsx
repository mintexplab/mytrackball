import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Users, Tag } from "lucide-react";
interface LabelDesignationWelcomeDialogProps {
  open: boolean;
  onClose: () => void;
  labelType: "partner_label" | "signature_label" | "prestige_label" | "label_free";
}
const LabelDesignationWelcomeDialog = ({
  open,
  onClose,
  labelType
}: LabelDesignationWelcomeDialogProps) => {
  const [step, setStep] = useState(1);
  const getLabelTypeName = () => {
    switch (labelType) {
      case "label_free":
        return "Label Free";
      case "partner_label":
        return "Partner Label";
      case "signature_label":
        return "Signature Label";
      case "prestige_label":
        return "Prestige Label";
      default:
        return "";
    }
  };
  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            You are now a {getLabelTypeName()}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3 - Let&apos;s get you started
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {step === 1 && <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Managing Your Labels</h3>
                  <p className="text-sm text-muted-foreground">
                    Go to the "Labels" tab in your dashboard to create and manage multiple labels under your account.
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                    <li>Click "Create New Label" to add a label</li>
                    <li>Each label can manage its own releases</li>
                    <li>Switch between labels using the label selector</li>
                    <li>Edit or delete labels as needed</li>
                  </ul>
                </div>
              </div>
            </div>}

          {step === 2 && <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Adding Users to Your Labels</h3>
                  <p className="text-sm text-muted-foreground">
                    Navigate to the "Users" tab to invite team members to collaborate on your labels.
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                    <li>Click "Invite User" to send an invitation</li>
                    <li>Select which label they'll belong to</li>
                    <li>Set their permissions (Catalog, Royalties, etc.)</li>
                    <li>Manage or remove users anytime</li>
                  </ul>
                </div>
              </div>
            </div>}

          {step === 3 && <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Tag className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Your Label Benefits</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    As a {getLabelTypeName()}, you have access to:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                    <li>Create and manage multiple labels</li>
                    <li>Invite unlimited users to your labels</li>
                    <li>Advanced permission controls</li>
                    <li>Priority support</li>
                    {labelType === "prestige_label" && <li>Publishing tab for PRO submissions</li>}
                    {labelType === "partner_label" && <li>Custom royalty split arrangement</li>}
                  </ul>
                </div>
              </div>
            </div>}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePrevious} disabled={step === 1}>
            Previous
          </Button>
          <Button onClick={handleNext}>
            {step === 3 ? "Get Started" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};
export default LabelDesignationWelcomeDialog;