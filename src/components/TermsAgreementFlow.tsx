import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TermsOfServiceContent, CURRENT_TERMS_VERSION } from "./TermsOfServiceContent";
import { SignaturePad } from "./SignaturePad";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, FileText, CheckCircle } from "lucide-react";
import trackballLogo from "@/assets/trackball-logo.png";

interface TermsAgreementFlowProps {
  userId: string;
  onComplete: () => void;
}

export const TermsAgreementFlow = ({ userId, onComplete }: TermsAgreementFlowProps) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = hasScrolledToBottom && signatureDataUrl && hasAgreed;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      // Convert base64 to blob for upload
      const response = await fetch(signatureDataUrl!);
      const blob = await response.blob();
      
      // Upload signature to storage
      const fileName = `${userId}/signature-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to save signature");
      }

      // Get public URL for the signature
      const { data: urlData } = supabase.storage
        .from("signatures")
        .getPublicUrl(fileName);

      // Update profile with terms acceptance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: CURRENT_TERMS_VERSION,
          terms_signature_url: urlData.publicUrl,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error("Failed to record agreement");
      }

      toast.success("Terms accepted successfully!");
      onComplete();
    } catch (error) {
      console.error("Error submitting terms agreement:", error);
      toast.error("Failed to submit agreement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <img src={trackballLogo} alt="Trackball" className="w-10 h-10 rounded-lg" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">Terms of Service Agreement</h1>
            <p className="text-sm text-muted-foreground">Please read and sign to continue</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden max-w-4xl mx-auto w-full">
        {/* Terms content */}
        <div className="flex-1 flex flex-col min-h-0">
          <TermsOfServiceContent onScrolledToBottom={setHasScrolledToBottom} />
        </div>

        {/* Signature section */}
        <div className="border-t border-border p-6 space-y-6 bg-card/50">
          {/* Progress indicators */}
          <div className="flex items-center justify-center gap-6">
            <div className={`flex items-center gap-2 ${hasScrolledToBottom ? "text-primary" : "text-muted-foreground"}`}>
              {hasScrolledToBottom ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">
                {hasScrolledToBottom ? "Terms Read" : "Read Terms"}
              </span>
            </div>
            <div className="w-8 h-px bg-border" />
            <div className={`flex items-center gap-2 ${signatureDataUrl ? "text-primary" : "text-muted-foreground"}`}>
              {signatureDataUrl ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">2</span>
              )}
              <span className="text-sm font-medium">Sign</span>
            </div>
            <div className="w-8 h-px bg-border" />
            <div className={`flex items-center gap-2 ${hasAgreed ? "text-primary" : "text-muted-foreground"}`}>
              {hasAgreed ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs">3</span>
              )}
              <span className="text-sm font-medium">Confirm</span>
            </div>
          </div>

          {/* Signature pad */}
          <SignaturePad
            onSignatureChange={setSignatureDataUrl}
            disabled={!hasScrolledToBottom}
          />

          {/* Agreement checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="agree-terms"
              checked={hasAgreed}
              onCheckedChange={(checked) => setHasAgreed(checked === true)}
              disabled={!hasScrolledToBottom || !signatureDataUrl}
              className="mt-0.5"
            />
            <label
              htmlFor="agree-terms"
              className={`text-sm ${
                !hasScrolledToBottom || !signatureDataUrl
                  ? "text-muted-foreground"
                  : "text-foreground cursor-pointer"
              }`}
            >
              I have read, understood, and agree to be bound by the Terms of Service Agreement. 
              I acknowledge that my electronic signature above constitutes a legally binding agreement.
            </label>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full h-12 text-lg font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Sign & Accept Terms"
            )}
          </Button>

          {!hasScrolledToBottom && (
            <p className="text-center text-sm text-muted-foreground">
              Please scroll through and read the entire agreement before signing
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
