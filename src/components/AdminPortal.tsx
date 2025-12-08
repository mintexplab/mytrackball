import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, FileMusic, Megaphone, DollarSign, Building2, Wallet, UserPlus, Music, Settings, ChevronDown, AlertTriangle, FileText, ShieldAlert, MessageSquare, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import trackballLogo from "@/assets/trackball-logo.png";
import UserManagement from "./UserManagement";
import ReleasesList from "./ReleasesList";
import { AnnouncementManagement } from "./AnnouncementManagement";
import RoyaltiesManagement from "./RoyaltiesManagement";
import SubaccountManagement from "./SubaccountManagement";
import AccountManagerManagement from "./AccountManagerManagement";
import { PayoutRequestsManagement } from "./PayoutRequestsManagement";
import VersionManagement from "./VersionManagement";
import ArtistInvitationManagement from "./ArtistInvitationManagement";
import PublishingManagement from "./PublishingManagement";
import MaintenanceManagement from "./MaintenanceManagement";
import AccountAppealsManagement from "./AccountAppealsManagement";
import { ProfileDropdown } from "./ProfileDropdown";
import { MobileMenu } from "./MobileMenu";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmailNotificationDialog } from "./EmailNotificationDialog";
import { AnnouncementBarManagement } from "./AnnouncementBarManagement";
import { TakedownRequestsManagement } from "./TakedownRequestsManagement";
import { InvoiceDraftsManagement } from "./InvoiceDraftsManagement";

import { OnboardingTutorial } from "./OnboardingTutorial";
import { AdminTicketManagement } from "./AdminTicketManagement";
import { Bug, GraduationCap, CreditCard } from "lucide-react";
import { TestPaymentSection } from "./TestPaymentSection";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FineManagement } from "./FineManagement";
import { TrackAllowanceAdminManagement } from "./TrackAllowanceAdminManagement";

interface AdminPortalProps {
  onSignOut: () => void;
  onViewArtistDashboard?: () => void;
}
const AdminPortal = ({
  onSignOut,
  onViewArtistDashboard
}: AdminPortalProps) => {
  const [activeTab, setActiveTab] = useState("users");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminAvatar, setAdminAvatar] = useState<string>("");
  const [adminArtistName, setAdminArtistName] = useState<string>("");
  const [adminFullName, setAdminFullName] = useState<string>("");
  const [adminUserId, setAdminUserId] = useState<string>("");
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedDebugPlan, setSelectedDebugPlan] = useState<string>("");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  useEffect(() => {
    fetchAdminProfile();
  }, []);
  const fetchAdminProfile = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      const {
        data: profile
      } = await supabase.from("profiles").select("email, avatar_url, artist_name, full_name").eq("id", user.id).single();
      if (profile) {
        setAdminEmail(profile.email);
        setAdminAvatar(profile.avatar_url || "");
        setAdminArtistName(profile.artist_name || "");
        setAdminFullName(profile.full_name || "");
        setAdminUserId(user.id);
      }
    }
  };

  const handleDebugPlanAssignment = async () => {
    if (!selectedDebugPlan || !adminUserId) {
      toast.error("Please select an account type");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_type: selectedDebugPlan })
        .eq("id", adminUserId);

      if (error) throw error;

      const accountNames: Record<string, string> = {
        artist: "Artist Account",
        label: "Label Account",
      };

      const accountBenefits: Record<string, string[]> = {
        artist: [
          "90/10 royalty split (you keep 90%)",
          "Release submission and management",
          "Catalog viewing",
          "Royalties tracking",
          "Support tickets",
          "Up to 3 artist names"
        ],
        label: [
          "90/10 royalty split (you keep 90%)",
          "Create and manage unlimited labels",
          "Invite unlimited users",
          "Full catalog management",
          "Publishing submissions",
          "Dedicated account manager",
          "Priority support"
        ],
      };

      const accountName = accountNames[selectedDebugPlan] || selectedDebugPlan;
      const benefits = accountBenefits[selectedDebugPlan] || [];
      
      const notificationMessage = `Welcome to your ${accountName}!\n\nYour benefits include:\n${benefits.map(b => `• ${b}`).join('\n')}`;

      await supabase.from("notifications").insert({
        user_id: adminUserId,
        title: `Welcome to ${accountName}`,
        message: notificationMessage,
        type: "account_assignment"
      });

      toast.success(`Assigned ${accountName} and sent notification`);
      setSelectedDebugPlan("");
    } catch (error: any) {
      console.error("Error assigning account type:", error);
      toast.error("Failed to assign account type");
    }
  };
  const handleSignOut = async () => {
    setIsLoggingOut(true);

    // Random delay between 3-10 seconds
    const randomDelay = Math.floor(Math.random() * 7000) + 3000;
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    await supabase.auth.signOut();
    navigate("/auth");
  };
  return <div className="min-h-screen bg-black">
      {isLoggingOut && <div className="fixed inset-0 z-50 bg-background animate-fade-in flex flex-col items-center justify-center gap-4">
          <p className="text-lg text-foreground animate-pulse">Signing you out of My Trackball</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>}
      
      <div className="absolute inset-0 bg-gradient-accent opacity-5 blur-3xl" />
      
      <div className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <MobileMenu 
              activeTab={activeTab} 
              setActiveTab={setActiveTab}
              isAdmin={true}
            />
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center overflow-hidden">
              <img src={trackballLogo} alt="Trackball Logo" className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                ​Trackball Admin      
              </h1>
              <p className="text-xs text-muted-foreground">
                Admin Portal
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {onViewArtistDashboard && (
              <Button variant="outline" size="sm" onClick={onViewArtistDashboard} className="hidden md:flex">
                <Users className="w-4 h-4 mr-2" />
                View Artist Dashboard
              </Button>
            )}
            
            {/* Main Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant={activeTab === "users" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("users")} className={activeTab === "users" ? "bg-gradient-primary text-primary-foreground" : ""}>
                <Users className="w-4 h-4 mr-2" />
                Users
              </Button>

              <Button variant={activeTab === "releases" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("releases")} className={activeTab === "releases" ? "bg-gradient-primary text-primary-foreground" : ""}>
                <FileMusic className="w-4 h-4 mr-2" />
                Releases
              </Button>

              <Button variant={activeTab === "takedowns" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("takedowns")} className={activeTab === "takedowns" ? "bg-gradient-primary text-primary-foreground" : ""}>
                <ShieldAlert className="w-4 h-4 mr-2" />
                Takedowns
              </Button>

              <Button variant={activeTab === "tickets" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("tickets")} className={activeTab === "tickets" ? "bg-gradient-primary text-primary-foreground" : ""}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Tickets
              </Button>

              {/* Content Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <FileMusic className="w-4 h-4" />
                    Content
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <DropdownMenuLabel>Content Management</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("publishing")} className="cursor-pointer">
                    <Music className="w-4 h-4 mr-2" />
                    Publishing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("announcements")} className="cursor-pointer">
                    <Megaphone className="w-4 h-4 mr-2" />
                    Announcements
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Financial Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <DollarSign className="w-4 h-4" />
                    Financial
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <DropdownMenuLabel>Financial Management</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("royalties")} className="cursor-pointer">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Royalties
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("payouts")} className="cursor-pointer">
                    <Wallet className="w-4 h-4 mr-2" />
                    Payout Requests
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("invoice-drafts")} className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Invoice Drafts
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("track-allowance")} className="cursor-pointer">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Track Allowance
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("fines")} className="cursor-pointer">
                    <AlertTriangle className="w-4 h-4 mr-2 text-destructive" />
                    <span className="text-destructive">Fines & Strikes</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Settings className="w-4 h-4" />
                    Settings
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <DropdownMenuLabel>System Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveTab("managers")} className="cursor-pointer">
                <Users className="w-4 h-4 mr-2" />
                Account Managers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("invite-artists")} className="cursor-pointer">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Users
              </DropdownMenuItem>
              <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("appeals")} className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Account Appeals
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("maintenance")} className="cursor-pointer">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Maintenance Mode
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("version")} className="cursor-pointer">
                    Version Manager
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("debug")} className="cursor-pointer">
                    <Bug className="w-4 h-4 mr-2" />
                    Debug Tools
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <ProfileDropdown 
              userEmail={adminEmail} 
              avatarUrl={adminAvatar}
              artistName={adminArtistName}
              fullName={adminFullName}
              onSignOut={handleSignOut} 
            />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile Navigation - Simplified */}
          <div className="flex md:hidden gap-2 mb-6 flex-wrap">
            <Button variant={activeTab === "users" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("users")} className={activeTab === "users" ? "bg-gradient-primary" : ""}>
              <Users className="w-4 h-4 mr-2" />
              Users
            </Button>
            <Button variant={activeTab === "releases" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("releases")} className={activeTab === "releases" ? "bg-gradient-primary" : ""}>
              <FileMusic className="w-4 h-4 mr-2" />
              Releases
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  More
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border">
                <DropdownMenuItem onClick={() => setActiveTab("managers")}>Managers</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("invite-artists")}>Invite Users</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("takedowns")}>Takedowns</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("announcements")}>Announcements</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("royalties")}>Royalties</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("payouts")}>Payouts</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("invoice-drafts")}>Invoice Drafts</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("publishing")}>Publishing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("appeals")}>Appeals</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("maintenance")}>Maintenance</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("version")}>Version</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("debug")}>Debug Tools</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="managers">
            <AccountManagerManagement />
          </TabsContent>

          <TabsContent value="releases">
            <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">RELEASE MODERATION</CardTitle>
                <CardDescription>Review and manage all user releases</CardDescription>
              </CardHeader>
              <CardContent>
                <ReleasesList isAdmin={true} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="takedowns">
            <TakedownRequestsManagement />
          </TabsContent>

          <TabsContent value="tickets">
            <AdminTicketManagement />
          </TabsContent>

          <TabsContent value="invite-artists">
            <ArtistInvitationManagement />
          </TabsContent>

          <TabsContent value="announcements">
            <div className="space-y-6">
              <div className="flex justify-end">
                <EmailNotificationDialog />
              </div>
              <AnnouncementBarManagement />
              <AnnouncementManagement />
            </div>
          </TabsContent>

          <TabsContent value="royalties">
            <RoyaltiesManagement />
          </TabsContent>

          <TabsContent value="payouts">
            <PayoutRequestsManagement />
          </TabsContent>

          <TabsContent value="fines">
            <FineManagement users={[]} onFineIssued={() => {}} />
          </TabsContent>

          <TabsContent value="track-allowance">
            <TrackAllowanceAdminManagement />
          </TabsContent>

          <TabsContent value="publishing">
            <PublishingManagement />
          </TabsContent>

          <TabsContent value="appeals">
            <AccountAppealsManagement />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceManagement />
          </TabsContent>

          <TabsContent value="version">
            <VersionManagement />
          </TabsContent>

          <TabsContent value="invoice-drafts">
            <InvoiceDraftsManagement />
          </TabsContent>

          <TabsContent value="debug">
            <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">DEBUG TOOLS</CardTitle>
                <CardDescription>Testing and debugging utilities for admin use</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">User Onboarding Tutorial</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Trigger the standard user onboarding tutorial to test the flow
                  </p>
                  <Button 
                    onClick={() => setShowOnboarding(true)}
                    variant="outline"
                  >
                    Start Onboarding Tutorial
                  </Button>
                </div>

                <div className="border-t border-border pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Account Type Assignment</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Assign yourself an account type and trigger the welcome notification (all accounts have 90/10 split)
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select value={selectedDebugPlan} onValueChange={setSelectedDebugPlan}>
                      <SelectTrigger className="w-full sm:w-[250px]">
                        <SelectValue placeholder="Select account type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="artist">Artist Account</SelectItem>
                        <SelectItem value="label">Label Account</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleDebugPlanAssignment}
                      disabled={!selectedDebugPlan}
                    >
                      Assign & Notify
                    </Button>
                  </div>
                </div>


                <div className="border-t border-border pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Test Stripe Payment</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a test checkout session with a custom amount to verify Stripe integration
                  </p>
                  <TestPaymentSection />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>


      {showOnboarding && (
        <OnboardingTutorial 
          onComplete={() => setShowOnboarding(false)} 
          onSkip={() => setShowOnboarding(false)}
        />
      )}
    </div>;
};
export default AdminPortal;