import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsOfServiceContentProps {
  onScrolledToBottom: (hasScrolled: boolean) => void;
}

export const CURRENT_TERMS_VERSION = "1.0";

export const TermsOfServiceContent = ({ onScrolledToBottom }: TermsOfServiceContentProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const element = scrollRef.current;
      if (!element) return;

      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      
      setScrollProgress(progress);
      
      // Consider "scrolled to bottom" when 95% scrolled
      if (progress >= 95) {
        onScrolledToBottom(true);
      }
    };

    const element = scrollRef.current;
    if (element) {
      element.addEventListener("scroll", handleScroll);
      return () => element.removeEventListener("scroll", handleScroll);
    }
  }, [onScrolledToBottom]);

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted z-10">
        <div 
          className="h-full bg-primary transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 pt-4 prose prose-invert prose-sm max-w-none"
        style={{ maxHeight: "60vh" }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-6">TRACKBALL DISTRIBUTION</h1>
        <h2 className="text-xl font-semibold text-foreground mb-4">TERMS OF SERVICE AGREEMENT</h2>
        <p className="text-muted-foreground mb-4">Version {CURRENT_TERMS_VERSION} | Effective Date: December 2024</p>

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
        <p className="text-muted-foreground mb-2"><strong className="text-foreground">Artist Accounts:</strong></p>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li>Limited to creating 1 label</li>
          <li>Can manage up to 3 artist names</li>
          <li>Cannot add other users to account</li>
          <li>No label customization features</li>
          <li>No smartlinks access</li>
        </ul>
        <p className="text-muted-foreground mb-2"><strong className="text-foreground">Label Accounts:</strong></p>
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
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li><strong className="text-foreground">Per Track Fee:</strong> $5.00 CAD per track</li>
          <li><strong className="text-foreground">UPC Fee:</strong> $8.00 CAD per release (Universal Product Code)</li>
        </ul>
        <p className="text-muted-foreground mb-4">
          <strong className="text-foreground">Example:</strong> A 10-track album would cost: (10 × $5.00) + $8.00 = $58.00 CAD
        </p>

        <h4 className="text-md font-medium text-foreground mt-4 mb-2">3.2 Track Allowance Subscription (Optional)</h4>
        <p className="text-muted-foreground mb-4">Users may opt for a monthly track allowance subscription:</p>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li><strong className="text-foreground">Tiers 1-9 (5-45 tracks):</strong> $4.00 CAD per track included</li>
          <li><strong className="text-foreground">Tiers 10+ (46+ tracks):</strong> $2.00 CAD per track included</li>
        </ul>
        <p className="text-muted-foreground mb-4">
          When track allowance is exceeded, users receive notification at 80% usage. 
          Excess tracks are charged at standard per-track rates.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">4. TAKEDOWN POLICY</h3>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">4.1 Takedown Fee</h4>
        <p className="text-muted-foreground mb-4">
          <strong className="text-foreground">Takedown Fee:</strong> $19.85 CAD per release
        </p>
        <p className="text-muted-foreground mb-4">
          Our distribution partner charges a 10 EUR fee for takedowns, and as such, we are required to pass this fee to users.
        </p>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">4.2 Takedown Process</h4>
        <p className="text-muted-foreground mb-4">
          Takedown requests are processed after payment confirmation. Processing time varies based on platform requirements 
          but typically completes within 5-14 business days.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5. ROYALTY DISTRIBUTION</h3>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">5.1 Revenue Split</h4>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li><strong className="text-foreground">Artist/Label Share:</strong> 90% of net royalties</li>
          <li><strong className="text-foreground">Trackball Share:</strong> 10% of net royalties</li>
        </ul>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">5.2 Collaborator Splits</h4>
        <p className="text-muted-foreground mb-4">
          Users may allocate royalty percentages to collaborators on specific releases. 
          Total collaborator allocations cannot exceed 100% of the user's share (90%).
        </p>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">5.3 Payout Requests</h4>
        <p className="text-muted-foreground mb-4">
          Payouts are user-initiated and subject to minimum thresholds. 
          Processing times vary based on payment method and banking institutions.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">6. PAYMENT TERMS</h3>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">6.1 Payment Methods</h4>
        <p className="text-muted-foreground mb-4">
          All payments are processed through Stripe. Users may save payment methods for faster transactions.
        </p>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">6.2 Pay Later Option</h4>
        <p className="text-muted-foreground mb-4">
          Users may elect to "Pay Later" when submitting releases. Payment must be completed within 3 business days. 
          <strong className="text-foreground"> Failure to pay will result in your release not being submitted and potential account termination.</strong>
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">7. FINES AND STRIKE SYSTEM</h3>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">7.1 Fine Categories</h4>
        <p className="text-muted-foreground mb-4">Fines may be issued for:</p>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li><strong className="text-foreground">Copyright Violation:</strong> Uploading content you do not own or have rights to</li>
          <li><strong className="text-foreground">Platform Misuse:</strong> Abuse of platform features or fraudulent activity</li>
          <li><strong className="text-foreground">Terms of Service Violation:</strong> Any breach of these Terms</li>
        </ul>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">7.2 Strike System</h4>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li><strong className="text-foreground">1st Strike:</strong> Fine issued. User must pay or receive 1-week account lock.</li>
          <li><strong className="text-foreground">2nd Strike:</strong> Additional fine issued. Same payment/lock terms apply.</li>
          <li><strong className="text-foreground">3rd Strike:</strong> Account automatically suspended. Additional $55.00 CAD penalty fee applied.</li>
        </ul>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">7.3 Fine Payment</h4>
        <p className="text-muted-foreground mb-4">
          Fines are charged to saved payment methods when available. Users without saved payment methods 
          must add one before continuing to use the platform.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">8. RELEASE REQUIREMENTS</h3>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">8.1 Release Types and Track Limits</h4>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li><strong className="text-foreground">Single:</strong> Maximum 3 tracks</li>
          <li><strong className="text-foreground">EP:</strong> Maximum 5 tracks</li>
          <li><strong className="text-foreground">Album:</strong> Maximum 25 tracks</li>
        </ul>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">8.2 Required Metadata</h4>
        <p className="text-muted-foreground mb-4">All releases must include:</p>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li>Release title and artist name</li>
          <li>Genre classification</li>
          <li>C-Line (Copyright) information</li>
          <li>P-Line (Phonographic) information</li>
          <li>Label name</li>
          <li>Per-track contributor credits (where applicable)</li>
        </ul>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">8.3 Technical Requirements</h4>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li><strong className="text-foreground">Audio:</strong> WAV or FLAC format, minimum 16-bit/44.1kHz</li>
          <li><strong className="text-foreground">Artwork:</strong> 3000×3000 pixels, JPEG or PNG format</li>
          <li><strong className="text-foreground">ISRC Codes:</strong> Auto-generated in format CBGNR25XXXXX</li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">9. RELEASE STATUSES</h3>
        <p className="text-muted-foreground mb-4">Releases progress through the following statuses:</p>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li><strong className="text-foreground">Pending:</strong> Submitted and awaiting review</li>
          <li><strong className="text-foreground">Payment Pending:</strong> Awaiting payment confirmation</li>
          <li><strong className="text-foreground">Pay Later:</strong> Deferred payment selected</li>
          <li><strong className="text-foreground">Approved:</strong> Approved for distribution</li>
          <li><strong className="text-foreground">Awaiting Final QC:</strong> Final quality control check</li>
          <li><strong className="text-foreground">Delivering:</strong> Being delivered to platforms</li>
          <li><strong className="text-foreground">Delivered:</strong> Live on streaming platforms</li>
          <li><strong className="text-foreground">Rejected:</strong> Not approved (reason provided)</li>
          <li><strong className="text-foreground">Taken Down:</strong> Removed from platforms</li>
          <li><strong className="text-foreground">Striked:</strong> Removed due to violation</li>
          <li><strong className="text-foreground">On Hold:</strong> Temporarily paused</li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">10. INTELLECTUAL PROPERTY</h3>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">10.1 Your Content</h4>
        <p className="text-muted-foreground mb-4">
          You retain all ownership rights to content you submit. By submitting content, you grant Trackball 
          a non-exclusive license to distribute your content to digital platforms.
        </p>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">10.2 Platform Ownership</h4>
        <p className="text-muted-foreground mb-4">
          The Trackball platform, including all software, design, and documentation, remains the exclusive 
          property of XZ1 Recording Ventures.
        </p>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">10.3 Warranties</h4>
        <p className="text-muted-foreground mb-4">
          By submitting content, you warrant that:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li>You own or have rights to all submitted content</li>
          <li>Content does not infringe any third-party rights</li>
          <li>All contributor information is accurate</li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">11. PUBLISHING (LABEL ACCOUNTS ONLY)</h3>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">11.1 Publishing Partnership</h4>
        <p className="text-muted-foreground mb-4">
          Publishing submissions are administered through XZ1 MUSIC PUBLISHING with AllTrack PRO affiliation.
        </p>
        <h4 className="text-md font-medium text-foreground mt-4 mb-2">11.2 Publishing Split</h4>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li><strong className="text-foreground">XZ1 MUSIC PUBLISHING:</strong> 30% publisher share (mandatory)</li>
          <li><strong className="text-foreground">IPI Number:</strong> 01280759627</li>
          <li><strong className="text-foreground">PRO Affiliation:</strong> AllTrack</li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">12. SUPPORT</h3>
        <p className="text-muted-foreground mb-4">
          Support is provided through the integrated ticket system. Response times vary based on account type 
          and issue priority. Contact: contact@trackball.cc
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">13. LIMITATION OF LIABILITY</h3>
        <p className="text-muted-foreground mb-4">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRACKBALL AND XZ1 RECORDING VENTURES SHALL NOT BE LIABLE 
          FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO 
          LOSS OF PROFITS, DATA, USE, OR GOODWILL.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">14. MODIFICATIONS TO TERMS</h3>
        <p className="text-muted-foreground mb-4">
          We reserve the right to modify these Terms at any time. Users will be notified of material changes 
          and may be required to accept updated terms to continue using the service.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">15. GOVERNING LAW</h3>
        <p className="text-muted-foreground mb-4">
          These Terms shall be governed by and construed in accordance with the laws of Canada, 
          without regard to conflict of law principles.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">16. CONTACT INFORMATION</h3>
        <p className="text-muted-foreground mb-4">
          For questions regarding these Terms, contact us at:
        </p>
        <p className="text-muted-foreground mb-2">
          <strong className="text-foreground">XZ1 Recording Ventures</strong><br />
          Email: contact@trackball.cc
        </p>

        <hr className="border-border my-6" />

        <p className="text-muted-foreground text-center mb-4">
          <strong className="text-foreground">
            BY SIGNING BELOW, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
          </strong>
        </p>
      </div>

      {/* Scroll indicator */}
      {scrollProgress < 95 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent h-16 flex items-end justify-center pb-2 pointer-events-none">
          <p className="text-sm text-muted-foreground animate-pulse">
            ↓ Scroll down to continue reading ↓
          </p>
        </div>
      )}
    </div>
  );
};
