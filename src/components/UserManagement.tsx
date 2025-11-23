import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Package, UserPlus, Ban, Lock, Unlock, Trash2, Mail, User, RotateCcw } from "lucide-react";
import { z } from "zod";
import SendNotificationDialog from "./SendNotificationDialog";
import { Separator } from "@/components/ui/separator";

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
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [banReason, setBanReason] = useState("");

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

    // Fetch label memberships
    const { data: labelMemberships } = await supabase
      .from("user_label_memberships")
      .select("*");

    // Fetch labels
    const { data: labels } = await supabase
      .from("labels")
      .select("*");

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

    // Create label map for quick lookup
    const labelMap = new Map(labels?.map(l => [l.id, l]) || []);

    // Merge the data
    const usersWithPlans = profilesData.map(profile => {
      const userLabels = labelMemberships?.filter(lm => lm.user_id === profile.id) || [];
      const parentLabel = profile.parent_account_id ? 
        labels?.find(l => l.user_id === profile.parent_account_id) : null;
      
      // Enrich user labels with full label data (including label_id)
      const enrichedUserLabels = userLabels.map(membership => {
        const fullLabel = labelMap.get(membership.label_id);
        return {
          ...membership,
          label_id_code: fullLabel?.label_id || 'N/A',
          label_name: fullLabel?.name || membership.label_name
        };
      });
      
      return {
        ...profile,
        user_plans: plansData?.filter(p => p.user_id === profile.id) || [],
        sublabel_count: sublabelCountMap[profile.id] || 0,
        is_master_account: (sublabelCountMap[profile.id] || 0) > 0,
        user_labels: enrichedUserLabels,
        parent_label: parentLabel
      };
    });

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
    if (currentBanStatus) {
      // Unbanning - no reason needed
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: false, ban_reason: null })
        .eq("id", userId);

      if (error) {
        toast.error("Failed to unban user");
        return;
      }

      toast.success("User unbanned");
      fetchUsers();
    } else {
      // Banning - open dialog to get reason
      setSelectedUserId(userId);
      setBanReason("");
      setBanDialogOpen(true);
    }
  };

  const confirmBan = async () => {
    if (!banReason.trim()) {
      toast.error("Please provide a reason for the ban");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ 
        is_banned: true,
        ban_reason: banReason.trim()
      })
      .eq("id", selectedUserId);

    if (error) {
      toast.error("Failed to ban user");
      return;
    }

    toast.success("User banned");
    setBanDialogOpen(false);
    setBanReason("");
    setSelectedUserId("");
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

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || "Failed to delete user");
    }
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

  const assignLabelDesignation = async (userId: string, labelType: string | null) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          label_type: labelType,
          label_designation_welcome_shown: false // Reset welcome dialog
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success(labelType ? "Label designation assigned successfully" : "Label designation removed");
      fetchUsers();
    } catch (error: any) {
      console.error("Label designation assignment error:", error);
      toast.error("Failed to assign label designation: " + error.message);
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

          <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-bold text-destructive">Ban User Account</DialogTitle>
                <DialogDescription>
                  Please provide a reason for terminating this account. This will be shown to the user.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="ban_reason">Reason for Ban</Label>
                  <Textarea
                    id="ban_reason"
                    placeholder="e.g., Violation of Terms of Service, fraudulent activity, copyright infringement..."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="bg-background border-border min-h-[120px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {banReason.length}/500 characters
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={confirmBan} 
                    className="flex-1 bg-destructive hover:bg-destructive/90"
                    disabled={!banReason.trim()}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Confirm Ban
                  </Button>
                  <Button 
                    onClick={() => setBanDialogOpen(false)} 
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Group users by label accounts */}
        {(() => {
          // Separate master accounts and independent users
          const masterAccounts = users.filter(u => u.is_master_account);
          const independentUsers = users.filter(u => !u.is_master_account && !u.parent_account_id);
          
          return (
            <div className="space-y-8">
              {/* Master Label Accounts */}
              {masterAccounts.map((masterUser) => {
                const subaccounts = users.filter(u => u.parent_account_id === masterUser.id);
                const masterLabel = masterUser.user_labels?.[0];
                const hasLabelDesignation = masterUser.label_type && 
                  ['partner_label', 'signature_label', 'prestige_label'].includes(masterUser.label_type);
                const isLabelUnconfigured = hasLabelDesignation && !masterLabel;
                
                return (
                  <div key={masterUser.id} className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-border">
                      <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
                        Label Account
                      </Badge>
                      {isLabelUnconfigured ? (
                        <span className="text-sm text-yellow-500 font-semibold">
                          Label unconfigured
                        </span>
                      ) : masterLabel ? (
                        <>
                          <span className="text-sm font-semibold text-foreground">
                            {masterLabel.label_name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ID: <span className="font-mono text-foreground">{masterLabel.label_id_code}</span>
                          </span>
                        </>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {subaccounts.length} subaccount{subaccounts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {/* Master Account Card with Red Glow */}
                      <Card className="bg-card/50 border-border hover:border-primary/30 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] border-red-500/50">
                        <CardContent className="p-4">
                          {/* User Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-red-500 shrink-0" />
                                <h3 className="font-semibold text-sm truncate">
                                  {masterUser.full_name || "No name set"}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                                <p className="text-xs text-muted-foreground truncate">
                                  {masterUser.email}
                                </p>
                              </div>
                              {masterUser.user_id && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  ID: {masterUser.user_id}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Status Badges */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {masterUser.is_banned ? (
                              <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                                <Ban className="w-3 h-3" />
                                Banned
                              </Badge>
                            ) : masterUser.is_locked ? (
                              <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                <Lock className="w-3 h-3" />
                                Locked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                                Active
                              </Badge>
                            )}

                            <Badge className="text-xs bg-red-500/20 text-red-500 border-red-500/30">
                              Master Account ({masterUser.sublabel_count})
                            </Badge>
                          </div>

                          {/* Current Plan */}
                          <div className="mb-3">
                            <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
                            {masterUser.user_plans?.[0]?.plan ? (
                              <Badge className="bg-gradient-primary text-white text-xs">
                                {masterUser.user_plans[0].plan.name}
                              </Badge>
                            ) : masterUser.label_type ? (
                              <Badge className="bg-gradient-primary text-white text-xs">
                                {masterUser.label_type.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">No Plan</Badge>
                            )}
                          </div>

                          <Separator className="my-3" />

                          {/* Plan Assignment */}
                          <div className="mb-3 space-y-3">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-2 block">Assign Plan</Label>
                              <Select
                                onValueChange={(planId) => assignPlan(masterUser.id, planId)}
                                defaultValue={masterUser.user_plans?.[0]?.plan_id}
                                disabled={masterUser.is_banned}
                              >
                                <SelectTrigger className="w-full bg-background/50 border-border h-8 text-xs">
                                  <SelectValue placeholder="Select plan" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                  {plans.map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                      <div className="flex items-center gap-2">
                                        <Package className="w-3 h-3" />
                                        <span className="text-xs">{plan.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-xs text-muted-foreground mb-2 block">Label Designation</Label>
                              <Select
                                onValueChange={(value) => assignLabelDesignation(masterUser.id, value === "none" ? null : value)}
                                defaultValue={masterUser.label_type || "none"}
                                disabled={masterUser.is_banned}
                              >
                                <SelectTrigger className="w-full bg-background/50 border-border h-8 text-xs">
                                  <SelectValue placeholder="Select designation" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                  <SelectItem value="none">
                                    <span className="text-xs">No Designation</span>
                                  </SelectItem>
                                  <SelectItem value="partner_label">
                                    <span className="text-xs">Partner Label</span>
                                  </SelectItem>
                                  <SelectItem value="signature_label">
                                    <span className="text-xs">Signature Label</span>
                                  </SelectItem>
                                  <SelectItem value="prestige_label">
                                    <span className="text-xs">Prestige Label</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <Separator className="my-3" />

                          {/* Actions - using masterUser instead of user */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`ban-${masterUser.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                {masterUser.is_banned ? "Unban User" : "Ban User"}
                              </Label>
                              <Switch
                                id={`ban-${masterUser.id}`}
                                checked={masterUser.is_banned}
                                onCheckedChange={() => toggleBanUser(masterUser.id, masterUser.is_banned)}
                              />
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLockUser(masterUser.id, masterUser.is_locked)}
                              className="w-full justify-start gap-2 h-8 text-xs"
                            >
                              {masterUser.is_locked ? (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  Unlock Account
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  Lock Account
                                </>
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await supabase
                                  .from("profiles")
                                  .update({ onboarding_completed: false })
                                  .eq("id", masterUser.id);
                                toast.success("Tutorial will start on next login");
                              }}
                              className="w-full justify-start gap-2 h-8 text-xs"
                              title="Reset tutorial for this user"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reset Tutorial
                            </Button>

                            <SendNotificationDialog 
                              userId={masterUser.id} 
                              userName={masterUser.full_name || masterUser.email} 
                            />

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteUser(masterUser.id, masterUser.email)}
                              className="w-full justify-start gap-2 h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete User
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Subaccount Cards */}
                      {subaccounts.map((subUser) => (
                        <Card key={subUser.id} className="bg-card/50 border-border hover:border-primary/30 transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <h3 className="font-semibold text-sm truncate">
                                    {subUser.full_name || "No name set"}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <p className="text-xs text-muted-foreground truncate">
                                    {subUser.email}
                                  </p>
                                </div>
                                {subUser.user_id && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    ID: {subUser.user_id}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {subUser.is_banned ? (
                                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                                  <Ban className="w-3 h-3" />
                                  Banned
                                </Badge>
                              ) : subUser.is_locked ? (
                                <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                  <Lock className="w-3 h-3" />
                                  Locked
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                                  Active
                                </Badge>
                              )}

                              <Badge variant="outline" className="text-xs bg-muted">
                                Subaccount
                              </Badge>
                            </div>

                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-1">Account Type</p>
                              <Badge variant="outline" className="text-xs">
                                Subaccount - {masterLabel?.label_id_code || 'N/A'}
                              </Badge>
                            </div>

                            <Separator className="my-3" />

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`ban-${subUser.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                  {subUser.is_banned ? "Unban User" : "Ban User"}
                                </Label>
                                <Switch
                                  id={`ban-${subUser.id}`}
                                  checked={subUser.is_banned}
                                  onCheckedChange={() => toggleBanUser(subUser.id, subUser.is_banned)}
                                />
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleLockUser(subUser.id, subUser.is_locked)}
                                className="w-full justify-start gap-2 h-8 text-xs"
                              >
                                {subUser.is_locked ? (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    Unlock Account
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3" />
                                    Lock Account
                                  </>
                                )}
                              </Button>

                              <SendNotificationDialog 
                                userId={subUser.id} 
                                userName={subUser.full_name || subUser.email} 
                              />

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteUser(subUser.id, subUser.email)}
                                className="w-full justify-start gap-2 h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete User
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Independent Users */}
              {independentUsers.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <Badge variant="outline" className="bg-muted">
                      Independent Artists
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {independentUsers.length} user{independentUsers.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {independentUsers.map((user) => (
                      <Card key={user.id} className="bg-card/50 border-border hover:border-primary/30 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                <h3 className="font-semibold text-sm truncate">
                                  {user.full_name || "No name set"}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                              {user.user_id && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  ID: {user.user_id}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {user.is_banned ? (
                              <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                                <Ban className="w-3 h-3" />
                                Banned
                              </Badge>
                            ) : user.is_locked ? (
                              <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                <Lock className="w-3 h-3" />
                                Locked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                                Active
                              </Badge>
                            )}

                            <Badge variant="outline" className="text-xs">Independent</Badge>
                          </div>

                          <div className="mb-3">
                            <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
                            {user.user_plans?.[0]?.plan ? (
                              <Badge className="bg-gradient-primary text-white text-xs">
                                {user.user_plans[0].plan.name}
                              </Badge>
                            ) : user.label_type ? (
                              <Badge className="bg-gradient-primary text-white text-xs">
                                {user.label_type.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">No Plan</Badge>
                            )}
                          </div>

                          <Separator className="my-3" />

                          <div className="mb-3 space-y-3">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-2 block">Assign Plan</Label>
                              <Select
                                onValueChange={(planId) => assignPlan(user.id, planId)}
                                defaultValue={user.user_plans?.[0]?.plan_id}
                                disabled={user.is_banned}
                              >
                                <SelectTrigger className="w-full bg-background/50 border-border h-8 text-xs">
                                  <SelectValue placeholder="Select plan" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                  {plans.map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                      <div className="flex items-center gap-2">
                                        <Package className="w-3 h-3" />
                                        <span className="text-xs">{plan.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-xs text-muted-foreground mb-2 block">Label Designation</Label>
                              <Select
                                onValueChange={(value) => assignLabelDesignation(user.id, value === "none" ? null : value)}
                                defaultValue={user.label_type || "none"}
                                disabled={user.is_banned}
                              >
                                <SelectTrigger className="w-full bg-background/50 border-border h-8 text-xs">
                                  <SelectValue placeholder="Select designation" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                  <SelectItem value="none">
                                    <span className="text-xs">No Designation</span>
                                  </SelectItem>
                                  <SelectItem value="partner_label">
                                    <span className="text-xs">Partner Label</span>
                                  </SelectItem>
                                  <SelectItem value="signature_label">
                                    <span className="text-xs">Signature Label</span>
                                  </SelectItem>
                                  <SelectItem value="prestige_label">
                                    <span className="text-xs">Prestige Label</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <Separator className="my-3" />

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`ban-${user.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                {user.is_banned ? "Unban User" : "Ban User"}
                              </Label>
                              <Switch
                                id={`ban-${user.id}`}
                                checked={user.is_banned}
                                onCheckedChange={() => toggleBanUser(user.id, user.is_banned)}
                              />
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLockUser(user.id, user.is_locked)}
                              className="w-full justify-start gap-2 h-8 text-xs"
                            >
                              {user.is_locked ? (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  Unlock Account
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  Lock Account
                                </>
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await supabase
                                  .from("profiles")
                                  .update({ onboarding_completed: false })
                                  .eq("id", user.id);
                                toast.success("Tutorial will start on next login");
                              }}
                              className="w-full justify-start gap-2 h-8 text-xs"
                              title="Reset tutorial for this user"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reset Tutorial
                            </Button>

                            <SendNotificationDialog 
                              userId={user.id} 
                              userName={user.full_name || user.email} 
                            />

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteUser(user.id, user.email)}
                              className="w-full justify-start gap-2 h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete User
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
};

export default UserManagement;
