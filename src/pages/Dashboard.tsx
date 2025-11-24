import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Bell, DollarSign, HelpCircle, Mail, Users, ChevronDown, ChevronUp, FileMusic, Building2, Home, Palette } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import trackballLogo from "@/assets/trackball-logo.png";
import AdminPortal from "@/components/AdminPortal";
import ReleasesList from "@/components/ReleasesList";
import ReleasesGallery from "@/components/ReleasesGallery";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { AnnouncementDialog } from "@/components/AnnouncementDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoyaltiesTab from "@/components/RoyaltiesTab";

import ClientInvitations from "@/components/ClientInvitations";
import ClientInvitationAcceptance from "@/components/ClientInvitationAcceptance";
import AccountManagerCard from "@/components/AccountManagerCard";
import PublishingTab from "@/components/PublishingTab";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MaintenanceDialog } from "@/components/MaintenanceDialog";
import { TerminatedAccountDialog } from "@/components/TerminatedAccountDialog";

import { DraftManagement } from "@/components/DraftManagement";
import { AdvancedCatalogManagement } from "@/components/AdvancedCatalogManagement";
import { FloatingAudioPlayer } from "@/components/FloatingAudioPlayer";
import { MobileMenu } from "@/components/MobileMenu";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { InitialAccountSetup } from "@/components/InitialAccountSetup";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { SparkleBeads } from "@/components/SparkleBeads";
import { DraggableDashboardBlocks } from "@/components/DraggableDashboardBlocks";
import { DocumentationSection } from "@/components/DocumentationSection";
import { QuickStatsBlock } from "@/components/dashboard/QuickStatsBlock";
import { AccountManagerBlock } from "@/components/dashboard/AccountManagerBlock";
import { ReleasesAndDraftsBlock } from "@/components/dashboard/ReleasesAndDraftsBlock";
import { PlanAndLabelsBlock } from "@/components/dashboard/PlanAndLabelsBlock";
import LabelManagementTab from "@/components/LabelManagementTab";
import LabelDesignationWelcomeDialog from "@/components/LabelDesignationWelcomeDialog";
import SubscriptionWelcomeDialog from "@/components/SubscriptionWelcomeDialog";
import { ModernSupportTicketSystem } from "@/components/ModernSupportTicketSystem";

import { LabelCustomizationTab } from "@/components/LabelCustomizationTab";
import { LabelInvitationNotification } from "@/components/LabelInvitationNotification";
import { LabelSwitcherDropdown } from "@/components/LabelSwitcherDropdown";
import { usePlanPermissions } from "@/hooks/usePlanPermissions";
import { FeatureLockBadge } from "@/components/FeatureLockBadge";

const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlan, setUserPlan] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [parentAccount, setParentAccount] = useState<any>(null);
  const [releaseCount, setReleaseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState("landing");
  const [selectedCatalogReleaseId, setSelectedCatalogReleaseId] = useState<string | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [showTerminatedDialog, setShowTerminatedDialog] = useState(false);
  const [floatingPlayer, setFloatingPlayer] = useState<{
    src: string;
    title: string;
    artist: string;
  } | null>(null);
  const [viewAsArtist, setViewAsArtist] = useState(false);
  const [showInitialSetup, setShowInitialSetup] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLabelDesignationWelcome, setShowLabelDesignationWelcome] = useState(false);
  const [labelDesignationType, setLabelDesignationType] = useState<"partner_label" | "signature_label" | "prestige_label" | "label_free" | null>(null);
  const [showSubscriptionWelcome, setShowSubscriptionWelcome] = useState(false);
  const [welcomePlanName, setWelcomePlanName] = useState("");
  const [welcomePlanFeatures, setWelcomePlanFeatures] = useState<string[]>([]);
  const [activeLabelDigitId, setActiveLabelDigitId] = useState<string>("");
  const [activeLabelLogo, setActiveLabelLogo] = useState<string | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const permissions = usePlanPermissions(userPlan, profile);

  // Function to apply accent color globally
  const applyAccentColor = (color: string) => {
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHSL = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return "0 84% 60%";
      
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      h = Math.round(h * 360);
      s = Math.round(s * 100);
      l = Math.round(l * 100);
      
      return `${h} ${s}% ${l}%`;
    };

    const hslColor = hexToHSL(color);
    
    // Apply to all primary color variables
    root.style.setProperty('--primary', hslColor);
    root.style.setProperty('--accent', hslColor);
    root.style.setProperty('--ring', hslColor);
    root.style.setProperty('--chart-1', hslColor);
    
    // Update gradients
    const [h, s, l] = hslColor.split(' ');
    const lightnessNum = parseInt(l);
    const darkerL = Math.max(20, lightnessNum - 15);
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${h} ${s} ${l}), hsl(${h} ${s} ${darkerL}%))`);
    root.style.setProperty('--gradient-accent', `linear-gradient(180deg, hsl(${h} ${s} ${l}), hsl(${h} ${s} ${darkerL}%))`);
    root.style.setProperty('--shadow-glow', `0 0 40px hsl(${h} ${s} ${l} / 0.3)`);
  };

  useEffect(() => {
    // Add fade-in animation on mount
    document.body.style.transition = "opacity 0.3s ease-in";
    document.body.style.opacity = "1";

    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          checkAdminStatus(session.user.id);
          fetchUserPlan(session.user.id);
        }, 0);
      }
    });
    supabase.auth.getSession().then(async ({
      data: {
        session
      }
    }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Check termination and maintenance FIRST, before loader
        checkTerminationStatus(session.user.id);
        checkMaintenanceMode(session.user.id);
        
        // Check if loader has been shown this session
        const loaderShown = sessionStorage.getItem('loginLoaderShown');
        if (!loaderShown) {
          setShowLoader(true);
          // Random delay between 5-10 seconds
          const randomDelay = Math.floor(Math.random() * 5000) + 5000;
          setTimeout(() => {
            setShowLoader(false);
            sessionStorage.setItem('loginLoaderShown', 'true');
          }, randomDelay);
        }
        checkAdminStatus(session.user.id);
        fetchUserPlan(session.user.id);
        fetchReleaseCount(session.user.id);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const checkAdminStatus = async (userId: string) => {
    const {
      data,
      error
    } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });
    if (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      return;
    }
    setIsAdmin(!!data);
  };

  const checkTerminationStatus = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("id", userId)
      .single();

    if (data?.is_banned) {
      setIsTerminated(true);
      setShowTerminatedDialog(true);
    } else {
      setIsTerminated(false);
      setShowTerminatedDialog(false);
    }
  };

  const checkMaintenanceMode = async (userId: string) => {
    // Check if user is admin first
    const { data: isAdminData } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    // Admins bypass maintenance mode
    if (isAdminData) {
      setMaintenanceMode(false);
      setShowMaintenanceDialog(false);
      return;
    }

    const { data } = await supabase
      .from("maintenance_settings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setMaintenanceMode(true);
      setShowMaintenanceDialog(true);
    } else {
      setMaintenanceMode(false);
      setShowMaintenanceDialog(false);
    }
  };

  // Listen for maintenance mode changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('maintenance_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_settings'
        },
        () => {
          checkMaintenanceMode(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Listen for profile changes (termination status AND avatar updates)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('profile_termination_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          checkTerminationStatus(user.id);
          // Also refresh profile to get updated avatar_url
          fetchUserPlan(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  const fetchUserPlan = async (userId: string) => {
    const {
      data
    } = await supabase.from("user_plans").select(`
        *,
        plan:plans(*)
      `).eq("user_id", userId).eq("status", "active").maybeSingle();
    setUserPlan(data);

    // Fetch profile with account manager fields
    const {
      data: profileData
    } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(profileData);

    // Fetch label 5-digit ID, accent color, and logo if user has an active label
    if (profileData?.active_label_id) {
      const { data: labelData } = await supabase
        .from("labels")
        .select("label_id, accent_color, logo_url")
        .eq("id", profileData.active_label_id)
        .single();
      
      if (labelData) {
        setActiveLabelDigitId(labelData.label_id);
        setActiveLabelLogo(labelData.logo_url);
        
        // Apply accent color globally if it exists
        if (labelData.accent_color) {
          applyAccentColor(labelData.accent_color);
        } else {
          // Reset to default red if no custom color
          applyAccentColor("#ef4444");
        }
      }
    } else {
      // Reset to default if no active label
      setActiveLabelLogo(null);
      applyAccentColor("#ef4444");
    }

    // Check if this is a newly assigned plan (subscription_welcome_shown_at is null or old)
    if (data?.plan && profileData) {
      const lastShown = profileData.subscription_welcome_shown_at;
      const planStarted = data.started_at;
      
      // Show welcome if never shown OR plan started after last welcome
      if (!lastShown || (planStarted && new Date(planStarted) > new Date(lastShown))) {
        const planFeatures = Array.isArray(data.plan.features) 
          ? (data.plan.features as string[]) 
          : [];
        setWelcomePlanName(data.plan.name);
        setWelcomePlanFeatures(planFeatures);
        setShowSubscriptionWelcome(true);
        
        // Mark as shown in database
        await supabase
          .from("profiles")
          .update({ subscription_welcome_shown_at: new Date().toISOString() })
          .eq("id", userId);
      }
    }

    // Check if label designation welcome should be shown
    const hasLabelDesignation = profileData?.label_type && 
      ['partner_label', 'signature_label', 'prestige_label'].includes(profileData.label_type);
    
    if (hasLabelDesignation && !profileData?.label_designation_welcome_shown) {
      setLabelDesignationType(profileData.label_type as "partner_label" | "signature_label" | "prestige_label");
      setShowLabelDesignationWelcome(true);
      
      // Mark as shown in database
      await supabase
        .from("profiles")
        .update({ label_designation_welcome_shown: true })
        .eq("id", userId);
    }

    // Check if initial setup or onboarding should be shown (only for non-admin, first-time users)
    const { data: isAdminData } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });
    
    if (!isAdminData && !profileData?.onboarding_completed) {
      // Check if account needs initial setup (no account_type set)
      if (!profileData?.account_type || profileData.account_type === 'pending') {
        setShowInitialSetup(true);
      } else {
        setShowOnboarding(true);
      }
    }

    // If user has a parent account, fetch parent account details
    if (profileData?.parent_account_id) {
      const { data: parentData } = await supabase
        .from("profiles")
        .select("label_name, display_name, artist_name, user_id")
        .eq("id", profileData.parent_account_id)
        .single();
      setParentAccount(parentData);
    }
  };

  // Refresh profile data periodically to catch admin updates
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      fetchUserPlan(user.id);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user?.id]);
  const fetchReleaseCount = async (userId: string) => {
    const {
      count
    } = await supabase.from("releases").select("*", {
      count: "exact",
      head: true
    }).eq("user_id", userId);
    setReleaseCount(count || 0);
  };
  const handleSignOut = async () => {
    setIsLoggingOut(true);

    // Random delay between 3-10 seconds
    const randomDelay = Math.floor(Math.random() * 7000) + 3000;
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    await supabase.auth.signOut();
    navigate("/auth");
  };
  if (loading || showLoader) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          {showLoader && <p className="text-muted-foreground animate-pulse">Loading your dashboard...</p>}
        </div>
      </div>;
  }
  if (isAdmin && !viewAsArtist) {
    return <AdminPortal onSignOut={handleSignOut} onViewArtistDashboard={() => setViewAsArtist(true)} />;
  }

  // Show terminated account dialog if user is banned (highest priority)
  if (isTerminated && showTerminatedDialog && user) {
    return (
      <div className="min-h-screen bg-background relative">
        <TerminatedAccountDialog userId={user.id} onSignOut={handleSignOut} />
      </div>
    );
  }

  // Show maintenance dialog if maintenance mode is active (before loader)
  if (maintenanceMode && showMaintenanceDialog && user) {
    return (
      <div className="min-h-screen bg-background relative">
        <MaintenanceDialog userId={user.id} onSignOut={handleSignOut} />
      </div>
    );
  }
  return <div className="min-h-screen bg-background relative">
      <AnnouncementBar />
      
      {isLoggingOut && <div className="fixed inset-0 z-50 bg-background animate-fade-in flex flex-col items-center justify-center gap-4">
          <p className="text-lg text-foreground animate-pulse">Signing you out of My Trackball</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>}
      
      <div className="absolute inset-0 bg-gradient-primary opacity-5 blur-3xl" />
      
      <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-30">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <MobileMenu 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                userPlan={userPlan}
                profile={profile}
              />
              <div 
                className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-all duration-300 hover:scale-105"
                onClick={() => setActiveTab("landing")}
              >
                <img 
                  src={activeLabelLogo || trackballLogo} 
                  alt={activeLabelLogo ? "Label Logo" : "Trackball Logo"} 
                  className="w-full h-full object-cover transition-all duration-300" 
                  key={activeLabelLogo || "default"}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto">
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
              <Button 
                variant={activeTab === "landing" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setActiveTab("landing")}
                className={activeTab === "landing" ? "bg-gradient-primary text-primary-foreground" : ""}
                data-tutorial="landing-tab"
              >
                <Home className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Landing</span>
              </Button>

              {/* Content Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <FileMusic className="w-4 h-4" />
                    <span className="hidden sm:inline">Content</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <DropdownMenuLabel>Content Management</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("catalog")} className="cursor-pointer" data-tutorial="catalog-tab">
                    <Package className="w-4 h-4 mr-2" />
                    Catalog
                  </DropdownMenuItem>
                  {permissions.canAccessPublishing && (
                    <DropdownMenuItem onClick={() => setActiveTab("publishing")} className="cursor-pointer" data-tutorial="publishing-tab">
                      <FileMusic className="w-4 h-4 mr-2" />
                      Publishing
                    </DropdownMenuItem>
                  )}
                  {!permissions.canAccessPublishing && (
                    <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                      <FileMusic className="w-4 h-4 mr-2" />
                      Publishing
                      <FeatureLockBadge 
                        isLocked={true} 
                        requiredPlan="Label Prestige/Partner"
                        feature="Publishing"
                        inline
                      />
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Financial Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="hidden sm:inline">Financial</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <DropdownMenuLabel>Financial Management</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("royalties")} className="cursor-pointer" data-tutorial="royalties-tab">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Royalties
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(permissions.canAddUsers || permissions.canCreateLabels) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">Team</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-card border-border z-50">
                    <DropdownMenuLabel>Team Management</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {permissions.canAddUsers ? (
                      <DropdownMenuItem onClick={() => setActiveTab("clients")} className="cursor-pointer" data-tutorial="clients-tab">
                        <Users className="w-4 h-4 mr-2" />
                        Users
                        {permissions.maxUsers && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            Max {permissions.maxUsers}
                          </span>
                        )}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                        <Users className="w-4 h-4 mr-2" />
                        Users
                        <FeatureLockBadge 
                          isLocked={true} 
                          requiredPlan="Trackball Prestige or Label plans"
                          feature="User Management"
                          inline
                        />
                      </DropdownMenuItem>
                    )}
                    {permissions.canCreateLabels ? (
                      <DropdownMenuItem onClick={() => setActiveTab("labels")} className="cursor-pointer">
                        <Building2 className="w-4 h-4 mr-2" />
                        Labels
                        {permissions.maxLabels && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            Max {permissions.maxLabels}
                          </span>
                        )}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                        <Building2 className="w-4 h-4 mr-2" />
                        Labels
                        <FeatureLockBadge 
                          isLocked={true} 
                          requiredPlan="Trackball Prestige or Label plans"
                          feature="Label Management"
                          inline
                        />
                      </DropdownMenuItem>
                    )}
                    {permissions.canCustomizeLabels ? (
                      <DropdownMenuItem onClick={() => setActiveTab("label-customization")} className="cursor-pointer">
                        <Palette className="w-4 h-4 mr-2" />
                        Label Customization
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                        <Palette className="w-4 h-4 mr-2" />
                        Label Customization
                        <FeatureLockBadge 
                          isLocked={true} 
                          requiredPlan="Label Signature/Prestige/Partner"
                          feature="Label Customization"
                          inline
                        />
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                variant={activeTab === "help" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setActiveTab("help")}
                className={activeTab === "help" ? "bg-gradient-primary text-primary-foreground" : ""}
                data-tutorial="help-tab"
              >
                <HelpCircle className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Help</span>
              </Button>
              </div>

              {/* Divider */}
              <div className="hidden lg:block w-px h-8 bg-border mx-3"></div>

              {/* Admin: Back to Admin Portal Button */}
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setViewAsArtist(false)}
                  className="hidden md:flex"
                >
                  Back to Admin Portal
                </Button>
              )}

              {/* Mobile: New Release Button + Profile */}
              <Button 
                size="sm" 
                variant="default" 
                className="bg-gradient-primary md:hidden" 
                onClick={() => navigate("/create-release")}
              >
                <Plus className="w-4 h-4" />
              </Button>

              {/* User Info Display - Name and Label Switcher */}
              <div className="hidden lg:flex flex-col items-end text-right">
                <p className="text-sm font-medium text-foreground">
                  {profile?.full_name || profile?.display_name || profile?.artist_name || "User"}
                </p>
                <LabelSwitcherDropdown
                  labelName={profile?.label_name}
                  labelDigitId={activeLabelDigitId}
                  parentAccount={parentAccount}
                />
              </div>

              {/* Notifications Dropdown */}
              <div className="flex items-center gap-3 ml-3" data-tutorial="notifications-icon">
                <NotificationsDropdown userId={user?.id || ""} />
                <ProfileDropdown
                  userEmail={user?.email} 
                  avatarUrl={profile?.avatar_url}
                  artistName={profile?.artist_name}
                  fullName={profile?.full_name}
                  userId={profile?.user_id}
                  onSignOut={handleSignOut} 
                  data-tutorial="profile-dropdown"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {user && <AnnouncementDialog userId={user.id} />}
      {user && <ClientInvitationAcceptance userId={user.id} />}
      <LabelInvitationNotification />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">

          <TabsContent value="landing" className="space-y-4 sm:space-y-6 animate-fade-in">
            <DraggableDashboardBlocks
              categories={[
                {
                  title: "Distribution",
                  blocks: [
                    {
                      id: "releases-drafts",
                      component: (
                        <ReleasesAndDraftsBlock
                          userId={user?.id}
                          onReleaseClick={(id) => {
                            setSelectedCatalogReleaseId(id);
                            setActiveTab("catalog");
                            const el = document.getElementById("catalog-tab-content");
                            if (el) {
                              el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }}
                        />
                      ),
                      visible: true,
                    },
                    {
                      id: "quick-stats",
                      component: <QuickStatsBlock userId={user?.id} />,
                      visible: true,
                    },
                  ],
                },
                {
                  title: "Support",
                  blocks: [
                    {
                      id: "plan-labels",
                      component: (
                        <PlanAndLabelsBlock
                          userPlan={userPlan}
                          labelType={profile?.label_type}
                          labelName={profile?.label_name}
                        />
                      ),
                      visible: true,
                    },
                    {
                      id: "account-manager",
                      component: <AccountManagerBlock profile={profile} />,
                      visible: !!(userPlan?.plan.name === "Trackball Prestige" && profile?.account_manager_name),
                    },
                  ],
                },
              ]}
            />
          </TabsContent>

          <TabsContent id="catalog-tab-content" value="catalog" className="animate-fade-in">
            {user && (
              <AdvancedCatalogManagement 
                userId={user.id} 
                selectedReleaseId={selectedCatalogReleaseId}
                onFloatingPlayer={(src, title, artist) => setFloatingPlayer({ src, title, artist })}
              />
            )}
          </TabsContent>


          {permissions.canAddUsers && (
            <TabsContent value="clients" className="animate-fade-in">
              <ClientInvitations permissions={permissions} />
            </TabsContent>
          )}

          {permissions.canCreateLabels && (
            <TabsContent value="labels" className="animate-fade-in">
              {user && <LabelManagementTab userId={user.id} userPlan={userPlan} permissions={permissions} />}
            </TabsContent>
          )}

          {permissions.canCustomizeLabels && (
            <TabsContent value="label-customization" className="animate-fade-in">
              <LabelCustomizationTab />
            </TabsContent>
          )}

        <TabsContent value="royalties" className="animate-fade-in">
            {user && <RoyaltiesTab userId={user.id} />}
          </TabsContent>

          {permissions.canAccessPublishing && (
            <TabsContent value="publishing" className="animate-fade-in">
              {user && <PublishingTab userId={user.id} />}
            </TabsContent>
          )}

          <TabsContent value="help" className="animate-fade-in">
            <div className="space-y-6">
              {!permissions.canAccessTickets && profile?.parent_account_id ? (
                <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2 text-left">
                      <HelpCircle className="w-6 h-6 text-primary" />
                      Contact Support
                    </CardTitle>
                    <CardDescription className="text-left">Get assistance for your account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                      <h3 className="font-semibold text-lg mb-2">Account Support</h3>
                      <p className="text-muted-foreground">
                        Please contact the person who invited you for assistance with your account, releases, or any questions you may have.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : !permissions.canAccessTickets ? (
                <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2 text-left">
                      <HelpCircle className="w-6 h-6 text-primary" />
                      Support Tickets
                    </CardTitle>
                    <CardDescription className="text-left">Available on Signature, Prestige, and Label plans</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 relative">
                      <FeatureLockBadge 
                        isLocked={true}
                        requiredPlan="Trackball/Label Signature or higher"
                        feature="Support Tickets"
                      />
                      <h3 className="font-semibold text-lg mb-2">Upgrade for Priority Support</h3>
                      <p className="text-muted-foreground">
                        Get access to our ticket system and receive priority support from our team. Available on Trackball Signature, Trackball Prestige, Label Signature, Label Prestige, and Label Partner plans.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Support Tickets Section */}
                  <ModernSupportTicketSystem />

                  {/* Documentation Section */}
                  <DocumentationSection />

                  {/* Contact Support Section */}
                  <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold flex items-center gap-2 text-left">
                        <HelpCircle className="w-6 h-6 text-primary" />
                        Contact Support
                      </CardTitle>
                      <CardDescription className="text-left">Get direct assistance from our team</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="p-6 rounded-lg bg-muted/50 border border-border">
                          <h3 className="font-semibold text-lg mb-2">Email Us</h3>
                          <p className="text-muted-foreground mb-4">
                            Need help with your account, releases, or have questions? Our support team is here to assist you.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button onClick={() => window.location.href = 'mailto:contact@trackball.cc'} className="bg-gradient-primary hover:opacity-90">
                              <Mail className="w-4 h-4 mr-2" />
                              Email Support
                            </Button>
                            <span className="text-sm text-muted-foreground self-center">
                              contact@trackball.cc
                            </span>
                          </div>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                  </>
                )}
              </div>
            </TabsContent>

          </Tabs>
      </main>

      {/* Floating Audio Player */}
      {floatingPlayer && (
        <FloatingAudioPlayer
          src={floatingPlayer.src}
          title={floatingPlayer.title}
          artist={floatingPlayer.artist}
          onClose={() => setFloatingPlayer(null)}
        />
      )}

      {/* Initial Account Setup - Shows first */}
      {showInitialSetup && (
        <InitialAccountSetup
          onComplete={async () => {
            setShowInitialSetup(false);
            // Refresh profile data to get updated account type and wait for it
            if (user?.id) {
              await fetchUserPlan(user.id);
              // Small delay to ensure state updates have propagated
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            // Show onboarding tutorial after setup
            setShowOnboarding(true);
          }}
        />
      )}

      {/* Onboarding Tutorial - Shows after initial setup */}
      {showOnboarding && !showInitialSetup && (
        <OnboardingTutorial
          onComplete={async () => {
            setShowOnboarding(false);
            // If label account, show label designation welcome after tutorial
            if (profile?.account_type === 'label' && profile?.label_type === 'Label Free') {
              setLabelDesignationType('label_free');
              setShowLabelDesignationWelcome(true);
            }
          }}
          onSkip={async () => {
            setShowOnboarding(false);
            // If label account, show label designation welcome after skipping tutorial
            if (profile?.account_type === 'label' && profile?.label_type === 'Label Free') {
              setLabelDesignationType('label_free');
              setShowLabelDesignationWelcome(true);
            }
          }}
          isLabelAccount={profile?.account_type === 'label'}
        />
      )}

      {/* Subscription Welcome Dialog - Shows first */}
      {showSubscriptionWelcome && (
        <SubscriptionWelcomeDialog
          open={showSubscriptionWelcome}
          onClose={() => {
            setShowSubscriptionWelcome(false);
            // After subscription welcome, check if label designation welcome should show
            if (labelDesignationType && !profile?.label_designation_welcome_shown) {
              setShowLabelDesignationWelcome(true);
            }
          }}
          planName={welcomePlanName}
          planFeatures={welcomePlanFeatures}
        />
      )}

      {/* Label Designation Welcome Dialog - Shows after subscription welcome */}
      {showLabelDesignationWelcome && labelDesignationType && !showSubscriptionWelcome && (
        <LabelDesignationWelcomeDialog
          open={showLabelDesignationWelcome}
          onClose={() => setShowLabelDesignationWelcome(false)}
          labelType={labelDesignationType}
        />
      )}
    </div>;
};
export default Dashboard;