import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, FileMusic, Megaphone, DollarSign, Building2, Wallet, UserPlus, Music, Settings, ChevronDown, AlertTriangle, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
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
import LabelInvitationManagement from "./LabelInvitationManagement";
import MaintenanceManagement from "./MaintenanceManagement";
import AccountAppealsManagement from "./AccountAppealsManagement";
import { ProfileDropdown } from "./ProfileDropdown";
interface AdminPortalProps {
  onSignOut: () => void;
}
const AdminPortal = ({
  onSignOut
}: AdminPortalProps) => {
  const [activeTab, setActiveTab] = useState("users");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminAvatar, setAdminAvatar] = useState<string>("");
  const navigate = useNavigate();
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
      } = await supabase.from("profiles").select("email, avatar_url").eq("id", user.id).single();
      if (profile) {
        setAdminEmail(profile.email);
        setAdminAvatar(profile.avatar_url || "");
      }
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
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                ​Trackball Admin      
              </h1>
              <p className="text-xs text-muted-foreground">
                Admin Portal
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
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
                  <DropdownMenuItem onClick={() => setActiveTab("labels")} className="cursor-pointer">
                    <Building2 className="w-4 h-4 mr-2" />
                    Label Accounts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("invite-artists")} className="cursor-pointer">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Artists
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("invite-labels")} className="cursor-pointer">
                    <Building2 className="w-4 h-4 mr-2" />
                    Invite Labels
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <ProfileDropdown userEmail={adminEmail} avatarUrl={adminAvatar} onSignOut={handleSignOut} />
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
                <DropdownMenuItem onClick={() => setActiveTab("labels")}>Labels</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("invite-artists")}>Invite Artists</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("invite-labels")}>Invite Labels</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("announcements")}>Announcements</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("royalties")}>Royalties</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("payouts")}>Payouts</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("publishing")}>Publishing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("appeals")}>Appeals</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("maintenance")}>Maintenance</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("version")}>Version</DropdownMenuItem>
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

          <TabsContent value="labels">
            <SubaccountManagement />
          </TabsContent>

          <TabsContent value="invite-artists">
            <ArtistInvitationManagement />
          </TabsContent>

          <TabsContent value="invite-labels">
            <LabelInvitationManagement />
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementManagement />
          </TabsContent>

          <TabsContent value="royalties">
            <RoyaltiesManagement />
          </TabsContent>

          <TabsContent value="payouts">
            <PayoutRequestsManagement />
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
        </Tabs>
      </main>
    </div>;
};
export default AdminPortal;