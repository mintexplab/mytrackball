import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Building2, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_subdistributor_master: boolean;
  subdistributor_dashboard_name: string | null;
  created_at: string;
}

export const SubdistributorManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, email, full_name, is_subdistributor_master, subdistributor_dashboard_name, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const toggleSubdistributorStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_subdistributor_master: !currentStatus,
          // If enabling, set default dashboard name
          ...((!currentStatus) && { subdistributor_dashboard_name: "My Trackball" })
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success(
        !currentStatus 
          ? "Subdistributor status enabled" 
          : "Subdistributor status disabled"
      );
      
      // Also assign subdistributor_admin role
      if (!currentStatus) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({
            user_id: userId,
            role: "subdistributor_admin"
          }, {
            onConflict: "user_id,role"
          });

        if (roleError) console.error("Error assigning role:", roleError);
      } else {
        // Remove subdistributor_admin role
        const { error: roleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "subdistributor_admin");

        if (roleError) console.error("Error removing role:", roleError);
      }

      await fetchUsers();
    } catch (error: any) {
      console.error("Error updating subdistributor status:", error);
      toast.error("Failed to update subdistributor status");
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Subdistributor Management
          </CardTitle>
          <CardDescription>
            Manage subdistributor master accounts. Subdistributors can fully customize their platform while all release QC comes to you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Subdistributor masters can customize dashboard name, logo, and branding for their entire organization (including subaccounts).
              All releases from subdistributors still flow to you for quality control.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by email, name, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="bg-muted/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{user.email}</p>
                          {user.is_subdistributor_master && (
                            <Badge variant="default" className="shrink-0">
                              <Building2 className="w-3 h-3 mr-1" />
                              Subdistributor
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>ID: {user.user_id}</span>
                          {user.full_name && <span>• {user.full_name}</span>}
                          {user.is_subdistributor_master && user.subdistributor_dashboard_name && (
                            <span>• Dashboard: {user.subdistributor_dashboard_name}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant={user.is_subdistributor_master ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleSubdistributorStatus(user.id, user.is_subdistributor_master)}
                        className="shrink-0"
                      >
                        {user.is_subdistributor_master ? (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Enable
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
