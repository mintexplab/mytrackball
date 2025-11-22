import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Bell, DollarSign, HelpCircle, Mail, Users, ChevronDown, ChevronUp, FileMusic, Upload } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import trackballLogo from "@/assets/trackball-logo.png";
import AdminPortal from "@/components/AdminPortal";
import ReleasesList from "@/components/ReleasesList";
import ReleasesGallery from "@/components/ReleasesGallery";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { AnnouncementDialog } from "@/components/AnnouncementDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationsTab from "@/components/NotificationsTab";
import RoyaltiesTab from "@/components/RoyaltiesTab";
import ArtistLabelOnboarding from "@/components/ArtistLabelOnboarding";
import ClientInvitations from "@/components/ClientInvitations";
import ClientInvitationAcceptance from "@/components/ClientInvitationAcceptance";
import AccountManagerCard from "@/components/AccountManagerCard";
import PublishingTab from "@/components/PublishingTab";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MaintenanceDialog } from "@/components/MaintenanceDialog";
import { TerminatedAccountDialog } from "@/components/TerminatedAccountDialog";
import BulkUploadTab from "@/components/BulkUploadTab";
import { DraftManagement } from "@/components/DraftManagement";
import { AdvancedCatalogManagement } from "@/components/AdvancedCatalogManagement";
import { FloatingAudioPlayer } from "@/components/FloatingAudioPlayer";
import { MobileMenu } from "@/components/MobileMenu";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { SparkleBeads } from "@/components/SparkleBeads";
import { DraggableDashboardBlocks } from "@/components/DraggableDashboardBlocks";
import { DocumentationSection } from "@/components/DocumentationSection";
import { QuickStatsBlock } from "@/components/dashboard/QuickStatsBlock";
import { YourReleasesBlock } from "@/components/dashboard/YourReleasesBlock";
import { YourPlanBlock } from "@/components/dashboard/YourPlanBlock";
import { AccountManagerBlock } from "@/components/dashboard/AccountManagerBlock";

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
  const [activeTab, setActiveTab] = useState("overview");
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  useEffect(() => {
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

    // Check if onboarding should be shown (only for non-admin, first-time users)
    const { data: isAdminData } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });
    
    if (!isAdminData && !profileData?.onboarding_completed && profileData?.mfa_setup_completed) {
      setShowOnboarding(true);
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
              />
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src={trackballLogo} alt="Trackball Logo" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 hidden sm:block">
                <h1 className="text-base sm:text-xl bg-gradient-primary bg-clip-text text-transparent truncate font-medium">
                  {profile?.label_name || "Trackball Distribution"}
                </h1>
                {profile?.artist_name && <p className="text-xs text-muted-foreground truncate">{profile.artist_name}</p>}
                {profile?.user_id && <p className="text-xs text-muted-foreground/70">ID:{profile.user_id}</p>}
                {parentAccount && (
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10">
                      Subaccount of {parentAccount.label_name || parentAccount.display_name || parentAccount.artist_name}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto">
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
              <Button 
                variant={activeTab === "overview" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setActiveTab("overview")}
                className={activeTab === "overview" ? "bg-gradient-primary text-primary-foreground" : ""}
                data-tutorial="overview-tab"
              >
                <Package className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Overview</span>
              </Button>

              {/* Releases Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <FileMusic className="w-4 h-4" />
                    <span className="hidden sm:inline">Releases</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <DropdownMenuLabel>Release Management</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("catalog")} className="cursor-pointer" data-tutorial="catalog-tab">
                    <Package className="w-4 h-4 mr-2" />
                    Catalog
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("bulk-upload")} className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Upload
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(userPlan?.plan.name === "Trackball Signature" || userPlan?.plan.name === "Trackball Prestige") && (
                <Button 
                  variant={activeTab === "clients" ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => setActiveTab("clients")}
                  className={activeTab === "clients" ? "bg-gradient-primary text-primary-foreground" : ""}
                >
                  <Users className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Users</span>
                </Button>
              )}

              <Button 
                variant={activeTab === "notifications" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setActiveTab("notifications")}
                className={activeTab === "notifications" ? "bg-gradient-primary text-primary-foreground" : ""}
                data-tutorial="notifications-tab"
              >
                <Bell className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Notifications</span>
              </Button>

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
                  {userPlan?.plan.name === "Trackball Prestige" && (
                    <DropdownMenuItem onClick={() => setActiveTab("publishing")} className="cursor-pointer">
                      <FileMusic className="w-4 h-4 mr-2" />
                      Publishing
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant={activeTab === "help" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setActiveTab("help")}
                className={activeTab === "help" ? "bg-gradient-primary text-primary-foreground" : ""}
              >
                <HelpCircle className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Help</span>
              </Button>
              </div>

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

              <div className="ml-2 pl-2 border-l border-border">
                <ProfileDropdown 
                  userEmail={user?.email} 
                  avatarUrl={profile?.avatar_url}
                  artistName={profile?.artist_name}
                  fullName={profile?.full_name}
                  onSignOut={handleSignOut} 
                  data-tutorial="profile-dropdown"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {user && <AnnouncementDialog userId={user.id} />}
      {user && <ArtistLabelOnboarding userId={user.id} userPlan={userPlan} />}
      {user && <ClientInvitationAcceptance userId={user.id} />}

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">

          <TabsContent value="overview" className="space-y-4 sm:space-y-6 animate-fade-in">
            <DraggableDashboardBlocks
              blocks={[
                {
                  id: "quick-stats",
                  component: <QuickStatsBlock userId={user?.id} />,
                  visible: true,
                },
                {
                  id: "your-releases",
                  component: (
                    <YourReleasesBlock
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
                  id: "drafts",
                  component: (
                    <Collapsible defaultOpen>
                      <DraftManagement />
                    </Collapsible>
                  ),
                  visible: true,
                },
                {
                  id: "account-manager",
                  component: <AccountManagerBlock profile={profile} />,
                  visible: !!(userPlan?.plan.name === "Trackball Prestige" && profile?.account_manager_name),
                },
                {
                  id: "your-plan",
                  component: <YourPlanBlock userPlan={userPlan} />,
                  visible: true,
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

          <TabsContent value="bulk-upload" className="animate-fade-in">
            {user && <BulkUploadTab userId={user.id} />}
          </TabsContent>

          {(userPlan?.plan.name === "Trackball Signature" || userPlan?.plan.name === "Trackball Prestige") && <TabsContent value="clients" className="animate-fade-in">
              <ClientInvitations />
            </TabsContent>}

          <TabsContent value="notifications" className="animate-fade-in">
            {user && <NotificationsTab userId={user.id} />}
          </TabsContent>

          <TabsContent value="royalties" className="animate-fade-in">
            {user && <RoyaltiesTab userId={user.id} />}
          </TabsContent>

          {userPlan?.plan.name === "Trackball Prestige" && (
            <TabsContent value="publishing" className="animate-fade-in">
              {user && <PublishingTab userId={user.id} />}
            </TabsContent>
          )}

          <TabsContent value="help" className="animate-fade-in">
            <div className="space-y-6">
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

      {/* Onboarding Tutorial */}
      {showOnboarding && (
        <OnboardingTutorial
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
    </div>;
};
export default Dashboard;