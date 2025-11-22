import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DraggableDashboardBlocks } from "@/components/DraggableDashboardBlocks";
import { Loader2 } from "lucide-react";
import AccountTypeSelection from "@/components/AccountTypeSelection";
import LabelUpgradePrompt from "@/components/LabelUpgradePrompt";
import { QuickStatsBlock } from "@/components/dashboard/QuickStatsBlock";
import { YourPlanBlock } from "@/components/dashboard/YourPlanBlock";
import { YourReleasesBlock } from "@/components/dashboard/YourReleasesBlock";
import { AccountManagerBlock } from "@/components/dashboard/AccountManagerBlock";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // Fetch user plan
      const { data: userPlanData } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      setProfile(profileData);
      setAccountType(profileData?.account_type || 'pending');
      setUserPlan(userPlanData);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show account type selection if account type is pending
  if (accountType === 'pending') {
    return <AccountTypeSelection onComplete={() => window.location.reload()} />;
  }

  // Show label upgrade prompt if user selected label but doesn't have qualifying plan
  if (accountType === 'label') {
    const hasQualifyingPlan = userPlan?.plan_name && [
      'Trackball Signature',
      'Trackball Prestige',
      'Trackball Partner'
    ].includes(userPlan.plan_name);

    if (!hasQualifyingPlan) {
      return <LabelUpgradePrompt />;
    }
  }

  const handleReleaseClick = (id: string) => {
    navigate(`/release/${id}`);
  };

  const blocks = [
    {
      id: "quick-stats",
      component: <QuickStatsBlock userId={userId || undefined} />,
      visible: true,
    },
    {
      id: "your-plan",
      component: <YourPlanBlock userPlan={userPlan} />,
      visible: true,
    },
    {
      id: "your-releases",
      component: <YourReleasesBlock userId={userId || undefined} onReleaseClick={handleReleaseClick} />,
      visible: true,
    },
    {
      id: "account-manager",
      component: <AccountManagerBlock profile={profile} />,
      visible: profile?.account_manager_name ? true : false,
    },
  ];

  return <DraggableDashboardBlocks blocks={blocks} />;
};

export default Dashboard;
