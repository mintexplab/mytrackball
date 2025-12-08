import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Redirect to dashboard services tab since plan info is now integrated there
  useEffect(() => {
    // Preserve any query parameters
    const params = searchParams.toString();
    const destination = params ? `/dashboard?tab=subscription&${params}` : "/dashboard?tab=subscription";
    navigate(destination, { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default SubscriptionManagement;
