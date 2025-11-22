import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Bell, DollarSign, HelpCircle, Mail, Users } from "lucide-react";
import { toast } from "sonner";
import trackballLogo from "@/assets/trackball-logo.png";
import AdminPortal from "@/components/AdminPortal";
import ReleasesList from "@/components/ReleasesList";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlan, setUserPlan] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [releaseCount, setReleaseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
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
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
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
  if (isAdmin) {
    return <AdminPortal onSignOut={handleSignOut} />;
  }
  return <div className="min-h-screen bg-background relative">
      {isLoggingOut && <div className="fixed inset-0 z-50 bg-background animate-fade-in flex flex-col items-center justify-center gap-4">
          <p className="text-lg text-foreground animate-pulse">Signing you out of My Trackball</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>}
      
      <div className="absolute inset-0 bg-gradient-primary opacity-5 blur-3xl" />
      
      <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src={trackballLogo} alt="Trackball Logo" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl bg-gradient-primary bg-clip-text text-transparent truncate font-medium">
                  {profile?.label_name || "Trackball Distribution"}
                </h1>
                {profile?.artist_name && <p className="text-xs text-muted-foreground truncate">{profile.artist_name}</p>}
                {profile?.user_id && <p className="text-xs text-muted-foreground/70">ID:{profile.user_id}</p>}
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <ProfileDropdown userEmail={user?.email} avatarUrl={profile?.avatar_url} onSignOut={handleSignOut} />
            </div>
          </div>
        </div>
      </header>

      {user && <AnnouncementDialog userId={user.id} />}
      {user && <ArtistLabelOnboarding userId={user.id} userPlan={userPlan} />}
      {user && <ClientInvitationAcceptance userId={user.id} />}

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6 relative">
        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full max-w-5xl mx-auto bg-card/80 backdrop-blur-sm border border-border p-1 rounded-lg sticky top-0 z-10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground flex-1 text-xs sm:text-sm py-2 transition-all">
              <Package className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            {(userPlan?.plan.name === "Trackball Signature" || userPlan?.plan.name === "Trackball Prestige") && <TabsTrigger value="clients" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground flex-1 text-xs sm:text-sm py-2 transition-all">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Clients</span>
              </TabsTrigger>}
            <TabsTrigger value="notifications" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground flex-1 text-xs sm:text-sm py-2 transition-all">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="royalties" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground flex-1 text-xs sm:text-sm py-2 transition-all">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Royalties</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground flex-1 text-xs sm:text-sm py-2 transition-all">
              <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Help</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6 animate-fade-in">
            <Collapsible defaultOpen>
              <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3 sm:pb-6 cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardTitle className="text-lg sm:text-2xl font-bold">Quick Stats</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Your distribution overview</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
                        <p className="text-xs sm:text-sm text-muted-foreground">Total Releases</p>
                        <p className="text-xl sm:text-2xl font-bold text-foreground">{releaseCount}</p>
                      </div>
                      <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
                        <p className="text-xs sm:text-sm text-muted-foreground">Active</p>
                        <p className="text-xl sm:text-2xl font-bold text-accent">{releaseCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <Collapsible defaultOpen>
              <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3 sm:pb-6 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg sm:text-2xl font-bold">Your Releases</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Manage your music distribution</CardDescription>
                      </div>
                      <Button onClick={(e) => { e.stopPropagation(); navigate("/create-release"); }} className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow w-full sm:w-auto text-sm">
                        <Plus className="w-4 h-4 mr-2" />
                        New Release
                      </Button>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <ReleasesList userId={user?.id} isAdmin={false} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {userPlan?.plan.name === "Trackball Prestige" && (
              <Collapsible defaultOpen>
                <AccountManagerCard managerName={profile?.account_manager_name} managerEmail={profile?.account_manager_email} managerPhone={profile?.account_manager_phone} managerTimezone={profile?.account_manager_timezone} userTimezone={profile?.user_timezone || "America/New_York"} />
              </Collapsible>
            )}

            <Collapsible defaultOpen>
              <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3 sm:pb-6 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg sm:text-2xl font-bold">Your Plan</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Current distribution plan</CardDescription>
                      </div>
                      <Package className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div>
                      <Badge className="bg-gradient-primary text-white px-2 sm:px-3 py-1 text-xs sm:text-sm">
                        {userPlan?.plan.name || "Trackball Free"}
                      </Badge>
                    </div>
                    {userPlan ? <>
                        <p className="text-sm sm:text-base text-muted-foreground">{userPlan.plan.description}</p>
                        <div className="pt-3 sm:pt-4 border-t border-border">
                          <p className="text-xs sm:text-sm font-medium mb-2">Plan Features:</p>
                          <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                            {userPlan.plan.features?.map((feature: string, index: number) => <li key={index} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                                <span className="flex-1">{feature}</span>
                              </li>)}
                          </ul>
                        </div>
                      </> : <p className="text-sm sm:text-base text-muted-foreground">Basic distribution plan with essential features</p>}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
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

          <TabsContent value="help" className="animate-fade-in">
            <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <HelpCircle className="w-6 h-6 text-primary" />
                  Help & Support
                </CardTitle>
                <CardDescription>Get assistance with your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-6 rounded-lg bg-muted/50 border border-border">
                    <h3 className="font-semibold text-lg mb-2">Contact Us</h3>
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <h4 className="font-medium mb-2">Distribution Support</h4>
                      <p className="text-sm text-muted-foreground">
                        Questions about release submissions, distribution status, or platform delivery
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <h4 className="font-medium mb-2">Account & Billing</h4>
                      <p className="text-sm text-muted-foreground">
                        Issues with your plan, payments, or account settings
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <h4 className="font-medium mb-2">Technical Issues</h4>
                      <p className="text-sm text-muted-foreground">
                        Upload problems, file format questions, or technical difficulties
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <h4 className="font-medium mb-2">General Inquiries</h4>
                      <p className="text-sm text-muted-foreground">
                        Partnership opportunities, feature requests, or general questions
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>;
};
export default Dashboard;