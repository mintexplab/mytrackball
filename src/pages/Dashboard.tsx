import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Music2 } from "lucide-react";
import { toast } from "sonner";
import AdminPortal from "@/components/AdminPortal";
import ReleasesList from "@/components/ReleasesList";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { AnnouncementDialog } from "@/components/AnnouncementDialog";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlan, setUserPlan] = useState<any>(null);
  const [releaseCount, setReleaseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminStatus(session.user.id);
            fetchUserPlan(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
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
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const fetchUserPlan = async (userId: string) => {
    const { data } = await supabase
      .from("user_plans")
      .select(`
        *,
        plan:plans(*)
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    
    setUserPlan(data);
  };

  const fetchReleaseCount = async (userId: string) => {
    const { count } = await supabase
      .from("releases")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    
    setReleaseCount(count || 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAdmin) {
    return <AdminPortal onSignOut={handleSignOut} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-primary opacity-5 blur-3xl" />
      
      <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                MY TRACKBALL
              </h1>
              <p className="text-xs text-muted-foreground">Artist Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-primary/30 bg-primary/5">
              Current subscription plan: {userPlan?.plan.name || "Trackball Free"}
            </Badge>
            <ProfileDropdown
              userEmail={user?.email}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </header>

      {user && <AnnouncementDialog userId={user.id} />}

      <main className="container mx-auto px-4 py-8 space-y-6 relative">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-bold">YOUR PLAN</CardTitle>
                  <CardDescription>Current distribution plan</CardDescription>
                </div>
                <Package className="w-8 h-8 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Badge className="bg-gradient-primary text-white px-3 py-1 text-sm">
                  {userPlan?.plan.name || "Trackball Free"}
                </Badge>
              </div>
              {userPlan ? (
                <>
                  <p className="text-muted-foreground">{userPlan.plan.description}</p>
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-2">Plan Features:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {userPlan.plan.features?.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Basic distribution plan with essential features</p>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">QUICK STATS</CardTitle>
            <CardDescription>Your distribution overview</CardDescription>
          </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Releases</p>
                  <p className="text-2xl font-bold text-foreground">{releaseCount}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-accent">{releaseCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold">YOUR RELEASES</CardTitle>
                <CardDescription>Manage your music distribution</CardDescription>
              </div>
              <Button 
                onClick={() => navigate("/create-release")}
                className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Release
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ReleasesList userId={user?.id} isAdmin={false} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
