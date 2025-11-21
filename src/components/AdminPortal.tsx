import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, FileMusic, Megaphone, DollarSign, Building2, Wallet, UserPlus } from "lucide-react";
import UserManagement from "./UserManagement";
import ReleasesList from "./ReleasesList";
import { AnnouncementManagement } from "./AnnouncementManagement";
import RoyaltiesManagement from "./RoyaltiesManagement";
import SubaccountManagement from "./SubaccountManagement";
import AccountManagerManagement from "./AccountManagerManagement";
import { PayoutRequestsManagement } from "./PayoutRequestsManagement";
import VersionManagement from "./VersionManagement";
import ArtistInvitationManagement from "./ArtistInvitationManagement";

interface AdminPortalProps {
  onSignOut: () => void;
}

const AdminPortal = ({ onSignOut }: AdminPortalProps) => {
  const [activeTab, setActiveTab] = useState("users");
  
  return (
    <div className="min-h-screen bg-black">
      <div className="absolute inset-0 bg-gradient-accent opacity-5 blur-3xl" />
      
      <div className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                MY TRACKBALL
              </h1>
              <p className="text-xs text-muted-foreground">
                Admin Portal
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="bg-muted/50 h-auto p-1 hidden md:flex">
                <TabsTrigger value="users" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="managers" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  Managers
                </TabsTrigger>
                <TabsTrigger value="releases" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                  <FileMusic className="w-4 h-4 mr-2" />
                  Releases
                </TabsTrigger>
                <TabsTrigger value="labels" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                  <Building2 className="w-4 h-4 mr-2" />
                  Labels
                </TabsTrigger>
                <TabsTrigger value="invite-artists" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Artists
                </TabsTrigger>
                <TabsTrigger value="announcements" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                  <Megaphone className="w-4 h-4 mr-2" />
                  Announcements
                </TabsTrigger>
                <TabsTrigger value="royalties" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Royalties
                </TabsTrigger>
                <TabsTrigger value="payouts" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                  <Wallet className="w-4 h-4 mr-2" />
                  Payouts
                </TabsTrigger>
                <TabsTrigger value="version" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                  Version
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              className="border-border hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-col md:hidden w-full bg-muted/50 h-auto">
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="managers" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Managers
            </TabsTrigger>
            <TabsTrigger value="releases" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground w-full justify-start">
              <FileMusic className="w-4 h-4 mr-2" />
              Releases
            </TabsTrigger>
            <TabsTrigger value="labels" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground w-full justify-start">
              <Building2 className="w-4 h-4 mr-2" />
              Labels
            </TabsTrigger>
            <TabsTrigger value="invite-artists" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground w-full justify-start">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Artists
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground w-full justify-start">
              <Megaphone className="w-4 h-4 mr-2" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="royalties" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground w-full justify-start">
              <DollarSign className="w-4 h-4 mr-2" />
              Royalties
            </TabsTrigger>
            <TabsTrigger value="payouts" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground w-full justify-start">
              <Wallet className="w-4 h-4 mr-2" />
              Payouts
            </TabsTrigger>
            <TabsTrigger value="version" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground w-full justify-start">
              Version
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="announcements">
            <AnnouncementManagement />
          </TabsContent>

          <TabsContent value="royalties">
            <RoyaltiesManagement />
          </TabsContent>

          <TabsContent value="payouts">
            <PayoutRequestsManagement />
          </TabsContent>

          <TabsContent value="version">
            <VersionManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPortal;
