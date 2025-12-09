import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, FileText, CheckCircle } from "lucide-react";
import trackballLogo from "@/assets/trackball-logo.png";

interface DocumentSigningFlowProps {
  userId: string;
  onComplete: () => void;
}

export const CURRENT_TERMS_VERSION = "2.0";

type DocumentType = "terms" | "content" | "refund";

interface DocumentInfo {
  id: DocumentType;
  title: string;
  shortTitle: string;
}

const DOCUMENTS: DocumentInfo[] = [
  { id: "terms", title: "Terms of Service", shortTitle: "Terms of Service" },
  { id: "content", title: "Content Policy", shortTitle: "Content Policy" },
  { id: "refund", title: "Refund Policy", shortTitle: "Refund Policy" },
];

const CONTENT_POLICY = `CONTENT POLICY

By using Trackball Distribution, you agree to the following content restrictions:

• NO AI-GENERATED MUSIC
All submitted content must be created by human artists. AI-generated compositions, vocals, or instrumentals are strictly prohibited.

• NO COVER SONGS
Cover versions of existing songs are not permitted unless you have obtained proper mechanical licenses and can provide documentation.

• NO REMAKES
Recreations or remakes of existing songs that substantially copy the original composition are not allowed.

• NO INFRINGING CONTENT
Any music that infringes on copyrights, trademarks, or other intellectual property rights is prohibited. This includes unlicensed samples, beats, or other materials you do not have rights to use.

• NO WHITE NOISE OR LOW-EFFORT CONTENT
Releases consisting of white noise, pink noise, nature sounds, or other low-effort audio designed to exploit streaming algorithms are prohibited.

• NO DSP NON-COMPLIANT CONTENT
Any content that may be rejected by digital service providers (DSPs) for non-compliance with their guidelines will not be distributed. This includes but is not limited to explicit content without proper labeling, misleading metadata, or content that violates platform community guidelines.

Violation of this policy may result in immediate release removal, account suspension, and/or termination without refund.`;

const REFUND_POLICY = `REFUND POLICY

NO REFUNDS ARE ALLOWED FOR ANY REASON.

ALL SALES AND FEES ARE FINAL.

This includes but is not limited to:
• Distribution fees (per-track and UPC fees)
• Takedown fees
• Track allowance subscription payments
• Any other fees or charges

By proceeding with any payment on Trackball Distribution, you acknowledge and accept that:

1. You have carefully reviewed your submission before payment
2. You understand that distribution fees are non-refundable once paid
3. You accept that takedown requests require payment and are non-refundable
4. You agree that subscription payments are non-refundable regardless of usage

If you have concerns about a payment or believe there has been a billing error, please contact support at contact@trackball.cc. While we cannot offer refunds, we will work with you to resolve any legitimate billing issues.`;

export const DocumentSigningFlow = ({ userId, onComplete }: DocumentSigningFlowProps) => {
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>("terms");
  const [signedDocuments, setSignedDocuments] = useState<Set<DocumentType>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allDocumentsSigned = DOCUMENTS.every((doc) => signedDocuments.has(doc.id));

  const handleAcceptDocument = () => {
    setSignedDocuments((prev) => new Set([...prev, selectedDocument]));

    // Find next unsigned document
    const nextUnsigned = DOCUMENTS.find((doc) => !signedDocuments.has(doc.id) && doc.id !== selectedDocument);
    if (nextUnsigned) {
      setSelectedDocument(nextUnsigned.id);
    }

    toast.success(`${DOCUMENTS.find((d) => d.id === selectedDocument)?.title} accepted!`);
  };

  const handleFinishOnboarding = async () => {
    if (!allDocumentsSigned) return;

    setIsSubmitting(true);
    try {
      // Update profile with terms acceptance (no signature needed)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: CURRENT_TERMS_VERSION,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error("Failed to record agreement");
      }

      toast.success("All documents accepted successfully!");
      onComplete();
    } catch (error) {
      console.error("Error submitting agreement:", error);
      toast.error("Failed to submit agreement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDocumentContent = (docId: DocumentType) => {
    switch (docId) {
      case "content":
        return CONTENT_POLICY;
      case "refund":
        return REFUND_POLICY;
      case "terms":
      default:
        return null;
    }
  };

  const isSigned = signedDocuments.has(selectedDocument);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src={trackballLogo} alt="Trackball" className="w-8 h-8 md:w-10 md:h-10 rounded-lg" />
          <div>
            <h1 className="text-lg md:text-xl font-bold text-foreground">Document Signing</h1>
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
              Please accept all documents to continue
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {signedDocuments.size}/{DOCUMENTS.length} accepted
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column - Document List & Accept Button */}
        <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-border shrink-0 bg-card/50 flex flex-col">
          <div className="p-3 md:p-4 flex-1">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Required Documents
            </h2>
            <div className="flex md:flex-col gap-2">
              {DOCUMENTS.map((doc) => {
                const isActive = selectedDocument === doc.id;
                const docSigned = signedDocuments.has(doc.id);

                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocument(doc.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all text-left w-full ${
                      isActive
                        ? "bg-primary/10 border border-primary/30"
                        : docSigned
                        ? "bg-green-500/10 border border-green-500/30"
                        : "bg-background hover:bg-muted border border-border"
                    }`}
                  >
                    {docSigned ? (
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <FileText className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    )}
                    <span
                      className={`text-sm font-medium flex-1 truncate ${
                        docSigned ? "text-green-500" : isActive ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <span className="hidden md:inline">{doc.title}</span>
                      <span className="md:hidden">{doc.shortTitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accept Button in Left Column */}
          <div className="p-3 md:p-4 border-t border-border">
            {isSigned ? (
              <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-500 font-medium text-sm">Document Accepted</span>
              </div>
            ) : (
              <Button
                onClick={handleAcceptDocument}
                className="w-full h-11"
              >
                Accept {DOCUMENTS.find((d) => d.id === selectedDocument)?.shortTitle}
              </Button>
            )}
          </div>
        </div>

        {/* Right Column - Document Content (Full Height) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-4 md:p-6 lg:p-8">
              {selectedDocument === "terms" ? (
                <TermsOfServiceDocument />
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground leading-relaxed bg-transparent p-0 m-0">
                    {getDocumentContent(selectedDocument)}
                  </pre>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer - Finish Button */}
      <div className="border-t border-border p-4 md:p-6 bg-background shrink-0">
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleFinishOnboarding}
            disabled={!allDocumentsSigned || isSubmitting}
            className="w-full h-12 text-base font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : allDocumentsSigned ? (
              "Continue to Dashboard"
            ) : (
              `Accept All Documents to Continue (${signedDocuments.size}/${DOCUMENTS.length})`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Inline Terms of Service Document Component
const TermsOfServiceDocument = () => (
  <div className="prose prose-invert prose-sm max-w-none">
    <h1 className="text-2xl font-bold text-foreground mb-6">TRACKBALL DISTRIBUTION</h1>
    <h2 className="text-xl font-semibold text-foreground mb-4">TERMS OF SERVICE AGREEMENT</h2>
    <p className="text-muted-foreground mb-4">Version {CURRENT_TERMS_VERSION} | Effective Date: December 8, 2025</p>

    <hr className="border-border my-6" />

    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">1. INTRODUCTION AND ACCEPTANCE</h3>
    <p className="text-muted-foreground mb-4">
      Welcome to Trackball Distribution ("Platform", "Service", "we", "us", or "our"), operated by XZ1 Recording Ventures.
      By creating an account, accessing, or using our services, you ("User", "Artist", "Label", or "you") agree to be
      bound by these Terms of Service ("Terms", "Agreement").
    </p>
    <p className="text-muted-foreground mb-4">
      <strong className="text-foreground">IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE SERVICE.</strong>
    </p>

    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">2. ACCOUNT TYPES AND ELIGIBILITY</h3>
    <h4 className="text-md font-medium text-foreground mt-4 mb-2">2.1 Account Types</h4>
    <p className="text-muted-foreground mb-2">
      <strong className="text-foreground">Artist Accounts:</strong>
    </p>
    <ul className="list-disc pl-6 text-muted-foreground mb-4">
      <li>Limited to creating 1 label</li>
      <li>Can manage up to 3 artist names</li>
      <li>Cannot add other users to account</li>
      <li>No label customization features</li>
      <li>No smartlinks access</li>
    </ul>
    <p className="text-muted-foreground mb-2">
      <strong className="text-foreground">Label Accounts:</strong>
    </p>
    <ul className="list-disc pl-6 text-muted-foreground mb-4">
      <li>Unlimited user additions</li>
      <li>Unlimited label creation</li>
      <li>Full publishing access</li>
      <li>Smartlinks functionality</li>
      <li>Priority support ticket system</li>
      <li>Dedicated account manager</li>
    </ul>

    <h4 className="text-md font-medium text-foreground mt-4 mb-2">2.2 Eligibility</h4>
    <p className="text-muted-foreground mb-4">
      You must be at least 18 years old or have legal guardian consent to use this service.
      By creating an account, you represent that you have the legal capacity to enter into this Agreement.
    </p>

    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3. DISTRIBUTION FEES</h3>
    <h4 className="text-md font-medium text-foreground mt-4 mb-2">3.1 Per-Release Fees</h4>
    <p className="text-muted-foreground mb-4">All fees are in Canadian Dollars (CAD):</p>
    <p className="text-muted-foreground mb-2">
      <strong className="text-foreground">Trackball Eco:</strong>
    </p>
    <ul className="list-disc pl-6 text-muted-foreground mb-4">
      <li><strong className="text-foreground">Per Track Fee:</strong> $1.00 CAD per track</li>
      <li><strong className="text-foreground">UPC Fee:</strong> $4.00 CAD per release</li>
    </ul>
    <p className="text-muted-foreground mb-2">
      <strong className="text-foreground">Trackball Standard:</strong>
    </p>
    <ul className="list-disc pl-6 text-muted-foreground mb-4">
      <li><strong className="text-foreground">Per Track Fee:</strong> $5.00 CAD per track</li>
      <li><strong className="text-foreground">UPC Fee:</strong> $8.00 CAD per release</li>
    </ul>

    <h4 className="text-md font-medium text-foreground mt-4 mb-2">3.2 Track Allowance Subscription (Optional)</h4>
    <p className="text-muted-foreground mb-4">Users may opt for a monthly track allowance subscription:</p>
    <ul className="list-disc pl-6 text-muted-foreground mb-4">
      <li><strong className="text-foreground">Tiers 1-9 (5-45 tracks):</strong> $4.00 CAD per track included</li>
      <li><strong className="text-foreground">Tiers 10+ (46+ tracks):</strong> $2.00 CAD per track included</li>
    </ul>

    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">4. TAKEDOWN POLICY</h3>
    <h4 className="text-md font-medium text-foreground mt-4 mb-2">4.1 Takedown Fee</h4>
    <p className="text-muted-foreground mb-4">
      <strong className="text-foreground">Takedown Fee:</strong> $19.85 CAD per release
    </p>
    <p className="text-muted-foreground mb-4">
      Our distribution partner charges a 10 EUR fee for takedowns, and as such, we are required to pass this fee to users.
    </p>

    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5. ROYALTY DISTRIBUTION</h3>
    <h4 className="text-md font-medium text-foreground mt-4 mb-2">5.1 Revenue Split</h4>
    <ul className="list-disc pl-6 text-muted-foreground mb-4">
      <li><strong className="text-foreground">Artist/Label Share:</strong> 90% of net royalties</li>
      <li><strong className="text-foreground">Trackball Share:</strong> 10% of net royalties</li>
    </ul>

    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">6. PAYMENT TERMS</h3>
    <p className="text-muted-foreground mb-4">
      All payments are processed through Stripe. Users may save payment methods for faster transactions.
      Pay Later option must be completed within 3 business days or release will not be submitted.
    </p>

    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">7. FINES AND STRIKE SYSTEM</h3>
    <ul className="list-disc pl-6 text-muted-foreground mb-4">
      <li><strong className="text-foreground">1st Strike:</strong> Fine issued. User must pay or receive 1-week account lock.</li>
      <li><strong className="text-foreground">2nd Strike:</strong> Additional fine issued. Same payment/lock terms apply.</li>
      <li><strong className="text-foreground">3rd Strike:</strong> Account suspended. $55 CAD penalty fee applies.</li>
    </ul>

    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">8. INTELLECTUAL PROPERTY</h3>
    <p className="text-muted-foreground mb-4">
      You retain all ownership rights to your music. By using our service, you grant Trackball a non-exclusive license
      to distribute your content to digital service providers on your behalf.
    </p>

    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">9. LIMITATION OF LIABILITY</h3>
    <p className="text-muted-foreground mb-4">
      Trackball Distribution is not liable for any indirect, incidental, special, consequential, or punitive damages
      resulting from your use of the service. Our total liability shall not exceed the fees paid by you in the
      preceding twelve months.
    </p>

    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">10. GOVERNING LAW</h3>
    <p className="text-muted-foreground mb-4">
      These Terms shall be governed by and construed in accordance with the laws of Canada, without regard to its
      conflict of law provisions.
    </p>

    <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">11. CONTACT INFORMATION</h3>
    <p className="text-muted-foreground mb-4">
      For questions about these Terms, please contact us at:<br />
      Email: contact@trackball.cc
    </p>

    <hr className="border-border my-6" />

    <p className="text-muted-foreground text-sm">
      By clicking "Accept", you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
    </p>
  </div>
);

export default DocumentSigningFlow;
