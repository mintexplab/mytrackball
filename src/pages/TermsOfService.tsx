import { TermsOfServiceContent } from "@/components/TermsOfServiceContent";
import trackballLogo from "@/assets/trackball-logo.png";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <img src={trackballLogo} alt="Trackball" className="w-8 h-8 rounded-lg" />
          <h1 className="text-lg font-bold text-foreground">Terms of Service</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-6">
        <TermsOfServiceContent onScrolledToBottom={() => {}} />
      </div>
    </div>
  );
};

export default TermsOfService;
