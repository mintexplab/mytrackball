import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, FileMusic, Megaphone, DollarSign, Building2, Mail } from "lucide-react";
import UserManagement from "./UserManagement";
import ReleasesList from "./ReleasesList";
import { AnnouncementManagement } from "./AnnouncementManagement";
import RoyaltiesManagement from "./RoyaltiesManagement";
import SubaccountManagement from "./SubaccountManagement";
import ClientInvitations from "./ClientInvitations";
import AccountManagerManagement from "./AccountManagerManagement";

interface AdminPortalProps {
  onSignOut: () => void;
}

const AdminPortal = ({ onSignOut }: AdminPortalProps) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-accent opacity-5 blur-3xl" />
      
      <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                MY TRACKBALL
              </h1>
              <p className="text-xs text-muted-foreground">Admin Portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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
      </header>

      <main className="container mx-auto px-4 py-8 relative">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-5xl grid-cols-7 bg-muted/50">
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="invitations" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
              <Mail className="w-4 h-4 mr-2" />
              Invitations
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
            <TabsTrigger value="announcements" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
              <Megaphone className="w-4 h-4 mr-2" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="royalties" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="w-4 h-4 mr-2" />
              Royalties
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="invitations">
            <ClientInvitations />
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

          <TabsContent value="announcements">
            <AnnouncementManagement />
          </TabsContent>

          <TabsContent value="royalties">
            <RoyaltiesManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPortal;
