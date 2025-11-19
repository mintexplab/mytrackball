import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Music2, Users, Package, FileMusic } from "lucide-react";
import UserManagement from "./UserManagement";
import ReleasesList from "./ReleasesList";

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
            <div className="w-10 h-10 bg-gradient-accent rounded-xl flex items-center justify-center shadow-accent-glow">
              <Music2 className="w-6 h-6 text-background" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                Trackball Distribution
              </h1>
              <p className="text-xs text-muted-foreground">Admin Portal</p>
            </div>
          </div>
          
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
      </header>

      <main className="container mx-auto px-4 py-8 relative">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50">
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-accent data-[state=active]:text-background">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="releases" className="data-[state=active]:bg-gradient-accent data-[state=active]:text-background">
              <FileMusic className="w-4 h-4 mr-2" />
              Releases
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="releases">
            <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl">Release Moderation</CardTitle>
                <CardDescription>Review and manage all user releases</CardDescription>
              </CardHeader>
              <CardContent>
                <ReleasesList isAdmin={true} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPortal;
