import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Package, UserPlus, Ban, Lock, Unlock, Trash2 } from "lucide-react";
import { z } from "zod";
import SendNotificationDialog from "./SendNotificationDialog";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  full_name: z.string().trim().min(1, "Name is required").max(100),
});

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  const fetchUsers = async () => {
    // Fetch profiles first
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast.error("Failed to load users");
      console.error("Profiles error:", profilesError);
      setLoading(false);
      return;
    }

    // Fetch user plans separately
    const { data: plansData } = await supabase
      .from("user_plans")
      .select(`
        *,
        plan:plans(*)
      `);

    // Fetch sublabel counts for each user
    const { data: sublabelCounts } = await supabase
      .from("profiles")
      .select("parent_account_id");

    // Count sublabels per master account
    const sublabelCountMap: Record<string, number> = {};
    sublabelCounts?.forEach(profile => {
      if (profile.parent_account_id) {
        sublabelCountMap[profile.parent_account_id] = 
          (sublabelCountMap[profile.parent_account_id] || 0) + 1;
      }
    });

    // Merge the data
    const usersWithPlans = profilesData.map(profile => ({
      ...profile,
      user_plans: plansData?.filter(p => p.user_id === profile.id) || [],
      sublabel_count: sublabelCountMap[profile.id] || 0,
      is_master_account: (sublabelCountMap[profile.id] || 0) > 0
    }));

    setUsers(usersWithPlans);
    setLoading(false);
  };

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("plans")
      .select("*")
      .order("price", { ascending: true });

    setPlans(data || []);
  };

  const createUser = async () => {
    try {
      // Validate input
      const validatedData = createUserSchema.parse({
        email: newUserEmail,
        password: newUserPassword,
        full_name: newUserName,
      });

      // Create user via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            full_name: validatedData.full_name,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("User created successfully");
      setCreateDialogOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      
      // Refresh user list after a short delay to allow database trigger to complete
      setTimeout(fetchUsers, 1000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to create user");
      }
    }
  };

  const toggleBanUser = async (userId: string, currentBanStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: !currentBanStatus })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update ban status");
      return;
    }

    toast.success(currentBanStatus ? "User unbanned" : "User banned");
    fetchUsers();
  };

  const toggleLockUser = async (userId: string, currentLockStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_locked: !currentLockStatus })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update lock status");
      return;
    }

    toast.success(currentLockStatus ? "Account unlocked" : "Account locked");
    fetchUsers();
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      toast.error("Failed to delete user");
      return;
    }

    toast.success("User deleted successfully");
    fetchUsers();
  };

  const assignPlan = async (userId: string, planId: string) => {
    try {
      const selectedPlan = plans.find(p => p.id === planId);
      
      // First, try to update existing plan
      const { data: existingPlan } = await supabase
        .from("user_plans")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingPlan) {
        // Update existing plan
        const { error } = await supabase
          .from("user_plans")
          .update({
            plan_id: planId,
            plan_name: selectedPlan?.name || 'Trackball Free',
            status: "active",
          })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Insert new plan
        const { error } = await supabase
          .from("user_plans")
          .insert({
            user_id: userId,
            plan_id: planId,
            plan_name: selectedPlan?.name || 'Trackball Free',
            status: "active",
          });

        if (error) throw error;
      }

      // Create welcome notification for the user
      const planFeatures = selectedPlan?.features || [];
      const benefitsText = planFeatures.map((f: string) => `• ${f}`).join('\n');
      
      await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: `Welcome to ${selectedPlan?.name || 'Trackball Free'}!`,
          message: `You've been enrolled in ${selectedPlan?.name || 'Trackball Free'}.\n\nYour Plan Benefits:\n${benefitsText}`,
          type: "plan_upgrade",
        });

      toast.success("Plan assigned successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Plan assignment error:", error);
      toast.error("Failed to assign plan: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">USER MANAGEMENT</CardTitle>
            <CardDescription>Manage user accounts and assign distribution plans</CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-bold">Create New User</DialogTitle>
                <DialogDescription>Add a new user account to the system</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <Button onClick={createUser} className="w-full bg-gradient-primary hover:opacity-90">
                  Create User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Current Plan</TableHead>
                <TableHead>Assign Plan</TableHead>
                <TableHead>Ban</TableHead>
                <TableHead>Lock</TableHead>
                <TableHead>Delete</TableHead>
                <TableHead>Notify</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    {user.full_name || "No name set"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <Ban className="w-3 h-3" />
                        Banned
                      </Badge>
                    ) : user.is_locked ? (
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        <Lock className="w-3 h-3" />
                        Locked
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_master_account ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        Master ({user.sublabel_count} sublabels)
                      </Badge>
                    ) : user.parent_account_id ? (
                      <Badge variant="outline" className="bg-muted">
                        Sublabel
                      </Badge>
                    ) : (
                      <Badge variant="outline">Regular</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.user_plans?.[0]?.plan ? (
                      <Badge className="bg-gradient-primary text-white">
                        {user.user_plans[0].plan.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No Plan</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      onValueChange={(planId) => assignPlan(user.id, planId)}
                      defaultValue={user.user_plans?.[0]?.plan_id}
                      disabled={user.is_banned}
                    >
                      <SelectTrigger className="w-[200px] bg-background/50 border-border">
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              {plan.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`ban-${user.id}`} className="text-xs text-muted-foreground cursor-pointer">
                        {user.is_banned ? "Unban" : "Ban"}
                      </Label>
                      <Switch
                        id={`ban-${user.id}`}
                        checked={user.is_banned}
                        onCheckedChange={() => toggleBanUser(user.id, user.is_banned)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLockUser(user.id, user.is_locked)}
                      className="gap-2"
                    >
                      {user.is_locked ? (
                        <>
                          <Unlock className="w-4 h-4" />
                          Unlock
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Lock
                        </>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteUser(user.id, user.email)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <SendNotificationDialog 
                      userId={user.id} 
                      userName={user.full_name || user.email} 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
