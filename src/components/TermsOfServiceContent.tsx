// Re-export from the new document signing flow
export { CURRENT_TERMS_VERSION } from "./DocumentSigningFlow";

import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsOfServiceContentProps {
  onScrolledToBottom: (hasScrolled: boolean) => void;
}

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
        <p className="text-muted-foreground mb-4">Version 2.0 | Effective Date: December 8, 2025</p>

        <hr className="border-border my-6" />

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">1. INTRODUCTION AND ACCEPTANCE</h3>
        <p className="text-muted-foreground mb-4">
          Welcome to Trackball Distribution, operated by XZ1 Recording Ventures. 
          By creating an account, accessing, or using our services, you agree to be 
          bound by these Terms of Service.
        </p>
        <p className="text-muted-foreground mb-4">
          <strong className="text-foreground">IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE SERVICE.</strong>
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">2. DISTRIBUTION FEES</h3>
        <p className="text-muted-foreground mb-4">All fees are in Canadian Dollars (CAD):</p>
        <p className="text-muted-foreground mb-2"><strong className="text-foreground">Trackball Eco:</strong></p>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li>$1.00 CAD per track</li>
          <li>$4.00 CAD UPC fee per release</li>
        </ul>
        <p className="text-muted-foreground mb-2"><strong className="text-foreground">Trackball Standard:</strong></p>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li>$5.00 CAD per track</li>
          <li>$8.00 CAD UPC fee per release</li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3. CONTENT POLICY</h3>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li>No AI-generated music</li>
          <li>No cover songs without proper licensing</li>
          <li>No remakes or infringing content</li>
          <li>No white noise or low-effort spam audio</li>
          <li>No DSP non-compliant content</li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">4. REFUND POLICY</h3>
        <p className="text-muted-foreground mb-4">
          <strong className="text-foreground">NO REFUNDS ARE ALLOWED FOR ANY REASON. ALL SALES AND FEES ARE FINAL.</strong>
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">5. ROYALTY DISTRIBUTION</h3>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li><strong className="text-foreground">Artist/Label Share:</strong> 90% of net royalties</li>
          <li><strong className="text-foreground">Trackball Share:</strong> 10% of net royalties</li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">6. CONTACT</h3>
        <p className="text-muted-foreground mb-4">
          For questions, contact us at: contact@trackball.cc
        </p>
      </div>

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