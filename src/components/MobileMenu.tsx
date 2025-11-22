import { Menu, X, Home, Package, Users, Bell, DollarSign, HelpCircle, FileMusic, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface MobileMenuProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userPlan?: any;
  isAdmin?: boolean;
}

export const MobileMenu = ({ activeTab, setActiveTab, userPlan, isAdmin = false }: MobileMenuProps) => {
  const [open, setOpen] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setOpen(false);
  };

  if (isAdmin) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-background/95 backdrop-blur-lg">
          <SheetHeader>
            <SheetTitle className="text-left">Admin Menu</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)] mt-6">
            <div className="space-y-2">
              <Button
                variant={activeTab === "users" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("users")}
              >
                <Users className="w-4 h-4 mr-2" />
                Users
              </Button>

              <Button
                variant={activeTab === "releases" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("releases")}
              >
                <FileMusic className="w-4 h-4 mr-2" />
                Releases
              </Button>

              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground px-3 font-medium">Content Management</p>

              <Button
                variant={activeTab === "publishing" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("publishing")}
              >
                <FileMusic className="w-4 h-4 mr-2" />
                Publishing
              </Button>

              <Button
                variant={activeTab === "announcements" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("announcements")}
              >
                <Bell className="w-4 h-4 mr-2" />
                Announcements
              </Button>

              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground px-3 font-medium">Financial Management</p>

              <Button
                variant={activeTab === "royalties" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("royalties")}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Royalties
              </Button>

              <Button
                variant={activeTab === "payouts" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("payouts")}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Payout Requests
              </Button>

              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground px-3 font-medium">System Settings</p>

              <Button
                variant={activeTab === "managers" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("managers")}
              >
                <Users className="w-4 h-4 mr-2" />
                Account Managers
              </Button>

              <Button
                variant={activeTab === "invite-artists" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("invite-artists")}
              >
                <Users className="w-4 h-4 mr-2" />
                Invite Artists
              </Button>

              <Button
                variant={activeTab === "invite-labels" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("invite-labels")}
              >
                <Package className="w-4 h-4 mr-2" />
                Invite Labels
              </Button>

              <Button
                variant={activeTab === "appeals" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("appeals")}
              >
                <FileMusic className="w-4 h-4 mr-2" />
                Account Appeals
              </Button>

              <Button
                variant={activeTab === "maintenance" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("maintenance")}
              >
                <FileMusic className="w-4 h-4 mr-2" />
                Maintenance Mode
              </Button>

              <Button
                variant={activeTab === "version" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("version")}
              >
                <FileMusic className="w-4 h-4 mr-2" />
                Version Manager
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-background/95 backdrop-blur-lg">
        <SheetHeader>
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] mt-6">
          <div className="space-y-2">
            <Button
              variant={activeTab === "overview" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => handleTabChange("overview")}
            >
              <Home className="w-4 h-4 mr-2" />
              Overview
            </Button>

            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground px-3 font-medium">Releases</p>

            <Button
              variant={activeTab === "catalog" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => handleTabChange("catalog")}
            >
              <Package className="w-4 h-4 mr-2" />
              Catalog
            </Button>

            <Button
              variant={activeTab === "bulk-upload" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => handleTabChange("bulk-upload")}
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>

            {(userPlan?.plan.name === "Trackball Signature" || userPlan?.plan.name === "Trackball Prestige") && (
              <>
                <Separator className="my-4" />
                <Button
                  variant={activeTab === "clients" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleTabChange("clients")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </Button>
              </>
            )}

            <Separator className="my-4" />
            <Button
              variant={activeTab === "notifications" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => handleTabChange("notifications")}
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>

            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground px-3 font-medium">Financial</p>

            <Button
              variant={activeTab === "royalties" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => handleTabChange("royalties")}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Royalties
            </Button>

            {userPlan?.plan.name === "Trackball Prestige" && (
              <Button
                variant={activeTab === "publishing" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleTabChange("publishing")}
              >
                <FileMusic className="w-4 h-4 mr-2" />
                Publishing
              </Button>
            )}

            <Separator className="my-4" />
            <Button
              variant={activeTab === "help" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => handleTabChange("help")}
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Help
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
