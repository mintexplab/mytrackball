import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Package, Ban, Lock, Unlock, Trash2, Mail, User, RotateCcw, MinusCircle } from "lucide-react";
import SendNotificationDialog from "./SendNotificationDialog";
import { Separator } from "@/components/ui/separator";

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

    // Fetch user roles
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("*");

    // Create role map for quick lookup
    const roleMap = new Map<string, string[]>();
    userRoles?.forEach(role => {
      if (!roleMap.has(role.user_id)) {
        roleMap.set(role.user_id, []);
      }
      roleMap.get(role.user_id)?.push(role.role);
    });

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
        parent_label: parentLabel,
        roles: roleMap.get(profile.id) || []
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

      toast.success("Plan updated successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Plan assignment error:", error);
      toast.error("Failed to update plan: " + error.message);
    }
  };

  const updateAccountType = async (userId: string, accountType: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_type: accountType })
        .eq("id", userId);

      if (error) throw error;

      toast.success(`Account type updated to ${accountType}`);
      fetchUsers();
    } catch (error: any) {
      console.error("Account type update error:", error);
      toast.error("Failed to update account type: " + error.message);
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

  const reverseStrike = async (userId: string, userName: string) => {
    try {
      // Get current strike count
      const { data: profile } = await supabase
        .from("profiles")
        .select("strike_count")
        .eq("id", userId)
        .single();

      const currentStrikes = profile?.strike_count || 0;
      
      if (currentStrikes <= 0) {
        toast.error("User has no strikes to reverse");
        return;
      }

      const newStrikeCount = currentStrikes - 1;

      // Update profile strike count
      const { error } = await supabase
        .from("profiles")
        .update({ 
          strike_count: newStrikeCount,
          // If we're going below 3 strikes, unsuspend the account
          suspended_at: newStrikeCount < 3 ? null : undefined,
          suspension_reason: newStrikeCount < 3 ? null : undefined
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success(`Strike reversed for ${userName}. Now at ${newStrikeCount}/3 strikes.`);
      fetchUsers();
    } catch (error: any) {
      console.error("Strike reversal error:", error);
      toast.error("Failed to reverse strike: " + error.message);
    }
  };

  // Filter plans based on account type
  const getFilteredPlans = (accountType: string | null) => {
    if (accountType === 'label') {
      // Label designations only: Partner Label, Signature Label, Prestige Label, Label Free
      return plans.filter(p => {
        const nameLower = p.name.toLowerCase();
        return nameLower.includes('label') && !nameLower.includes('trackball');
      });
    } else {
      // Artist plans only: Trackball Free, Trackball Lite, Trackball Signature, Trackball Prestige
      return plans.filter(p => {
        const nameLower = p.name.toLowerCase();
        return nameLower.includes('trackball');
      });
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
          // Separate admin accounts, label accounts, and independent users
          const adminAccounts = users.filter(u => u.roles?.includes('admin'));
          
          // Label accounts: users with account_type === 'label' AND (label designation OR created labels)
          const labelAccounts = users.filter(u => {
            if (u.roles?.includes('admin')) return false;
            if (u.account_type !== 'label') return false; // Must be explicitly set as label account
            const hasLabelDesignation = u.label_type && 
              ['Label Partner', 'Label Signature', 'Label Prestige', 'Label Free', 'Label Lite'].includes(u.label_type);
            const hasCreatedLabels = u.user_labels && u.user_labels.length > 0;
            return hasLabelDesignation || hasCreatedLabels || u.is_master_account;
          });
          
          const independentUsers = users.filter(u => {
            if (u.roles?.includes('admin')) return false;
            if (u.parent_account_id) return false; // Skip subaccounts
            // Independent users are artist accounts without label designations
            return u.account_type !== 'label';
          });
          
          return (
            <div className="space-y-8">
              {/* Admin Accounts */}
              {adminAccounts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <Badge variant="outline" className="bg-destructive/10 border-destructive/30 text-destructive">
                      Admin Accounts
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {adminAccounts.length} account{adminAccounts.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {adminAccounts.map((adminUser) => (
                      <Card key={adminUser.id} className="bg-card/50 border-border hover:border-destructive/30 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] border-destructive/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                <h3 className="font-semibold text-sm truncate">
                                  {adminUser.full_name || "No name set"}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                                <p className="text-xs text-muted-foreground truncate">
                                  {adminUser.email}
                                </p>
                              </div>
                              {adminUser.user_id && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  ID: {adminUser.user_id}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                              Admin
                            </Badge>
                          </div>

                          <div className="mb-3">
                            <p className="text-xs text-muted-foreground mb-1">Role</p>
                            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                              Platform Administrator
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {/* Label Accounts */}
              {labelAccounts.map((masterUser) => {
                const subaccounts = users.filter(u => u.parent_account_id === masterUser.id);
                const masterLabel = masterUser.user_labels?.[0];
                const hasLabelDesignation = masterUser.label_type && 
                  ['Label Partner', 'Label Signature', 'Label Prestige', 'Label Free', 'Label Lite'].includes(masterUser.label_type);
                // Show label name from profile if no actual label created yet
                const displayLabelName = masterLabel?.label_name || masterUser.label_name;
                const displayLabelId = masterLabel?.label_id_code;
                const isLabelUnconfigured = hasLabelDesignation && !displayLabelName && masterUser.account_type === 'label';
                
                return (
                  <div key={masterUser.id} className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-border">
                      <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
                        Label Account
                      </Badge>
                      {displayLabelName ? (
                        <>
                          <span className="text-sm font-semibold text-foreground">
                            {displayLabelName}
                          </span>
                          {displayLabelId && (
                            <span className="text-sm text-muted-foreground">
                              ID: <span className="font-mono text-foreground">{displayLabelId}</span>
                            </span>
                          )}
                          {masterUser.label_type && (
                            <Badge variant="outline" className="text-xs bg-gradient-primary text-white">
                              {masterUser.label_type.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </Badge>
                          )}
                        </>
                      ) : isLabelUnconfigured ? (
                        <span className="text-sm text-yellow-500 font-semibold">
                          Label unconfigured
                        </span>
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

                          {/* Account Type Management */}
                          <div className="mb-3 space-y-3">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-2 block">Account Type</Label>
                              <Select
                                onValueChange={(value) => updateAccountType(masterUser.id, value)}
                                defaultValue={masterUser.account_type || "artist"}
                                disabled={masterUser.is_banned}
                              >
                                <SelectTrigger className="w-full bg-background/50 border-border h-8 text-xs">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                  <SelectItem value="artist">
                                    <span className="text-xs">Artist Account</span>
                                  </SelectItem>
                                  <SelectItem value="label">
                                    <span className="text-xs">Label Account</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Show label designation info for label accounts */}
                            {masterUser.account_type === 'label' && (
                              <div>
                                <Label className="text-xs text-muted-foreground mb-2 block">Label Designation</Label>
                                <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border border-border">
                                  Manage label designations in the Label Designation tab
                                </div>
                              </div>
                            )}
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

                            {(masterUser.strike_count || 0) > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => reverseStrike(masterUser.id, masterUser.full_name || masterUser.email)}
                                className="w-full justify-start gap-2 h-8 text-xs text-yellow-500 hover:text-yellow-500 hover:bg-yellow-500/10"
                                title={`Reverse strike (${masterUser.strike_count}/3)`}
                              >
                                <MinusCircle className="w-3 h-3" />
                                Reverse Strike ({masterUser.strike_count}/3)
                              </Button>
                            )}

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

                              {(subUser.strike_count || 0) > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => reverseStrike(subUser.id, subUser.full_name || subUser.email)}
                                  className="w-full justify-start gap-2 h-8 text-xs text-yellow-500 hover:text-yellow-500 hover:bg-yellow-500/10"
                                  title={`Reverse strike (${subUser.strike_count}/3)`}
                                >
                                  <MinusCircle className="w-3 h-3" />
                                  Reverse Strike ({subUser.strike_count}/3)
                                </Button>
                              )}

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
                              <Label className="text-xs text-muted-foreground mb-2 block">Account Type</Label>
                              <Select
                                onValueChange={(value) => updateAccountType(user.id, value)}
                                defaultValue={user.account_type || "artist"}
                                disabled={user.is_banned}
                              >
                                <SelectTrigger className="w-full bg-background/50 border-border h-8 text-xs">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                  <SelectItem value="artist">
                                    <span className="text-xs">Artist Account</span>
                                  </SelectItem>
                                  <SelectItem value="label">
                                    <span className="text-xs">Label Account</span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Show label designation info for label accounts */}
                            {user.account_type === 'label' && (
                              <div>
                                <Label className="text-xs text-muted-foreground mb-2 block">Label Designation</Label>
                                <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border border-border">
                                  Manage label designations in the Label Designation tab
                                </div>
                              </div>
                            )}
                          </div>

                          <Separator className="my-3" />

                          {/* Plan Assignment for Artist Accounts */}
                          {user.account_type !== 'label' && (
                            <>
                              <div className="mb-3">
                                <Label className="text-xs text-muted-foreground mb-2 block">Assign Plan</Label>
                                <Select
                                  onValueChange={(value) => assignPlan(user.id, value)}
                                  defaultValue={user.user_plans?.[0]?.plan_id}
                                  disabled={user.is_banned}
                                >
                                  <SelectTrigger className="w-full bg-background/50 border-border h-8 text-xs">
                                    <SelectValue placeholder="Select plan" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-card border-border">
                                    {getFilteredPlans(user.account_type).map((plan) => (
                                      <SelectItem key={plan.id} value={plan.id} className="text-xs">
                                        {plan.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <Separator className="my-3" />
                            </>
                          )}


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

                            {(user.strike_count || 0) > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => reverseStrike(user.id, user.full_name || user.email)}
                                className="w-full justify-start gap-2 h-8 text-xs text-yellow-500 hover:text-yellow-500 hover:bg-yellow-500/10"
                                title={`Reverse strike (${user.strike_count}/3)`}
                              >
                                <MinusCircle className="w-3 h-3" />
                                Reverse Strike ({user.strike_count}/3)
                              </Button>
                            )}

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
