import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Ban, Lock, Unlock, Trash2, Mail, User, RotateCcw, MinusCircle, Search, Building2, Music, ChevronRight, Settings, Edit } from "lucide-react";
import SendNotificationDialog from "./SendNotificationDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

const CompactUserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [banReason, setBanReason] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast.error("Failed to load users");
      setLoading(false);
      return;
    }

    const { data: userRoles } = await supabase.from("user_roles").select("*");
    const { data: labelMemberships } = await supabase.from("user_label_memberships").select("*");
    const { data: labels } = await supabase.from("labels").select("*");

    const roleMap = new Map<string, string[]>();
    userRoles?.forEach(role => {
      if (!roleMap.has(role.user_id)) {
        roleMap.set(role.user_id, []);
      }
      roleMap.get(role.user_id)?.push(role.role);
    });

    const labelMap = new Map(labels?.map(l => [l.id, l]) || []);

    const usersWithData = profilesData.map(profile => {
      const userLabels = labelMemberships?.filter(lm => lm.user_id === profile.id) || [];
      const enrichedUserLabels = userLabels.map(membership => {
        const fullLabel = labelMap.get(membership.label_id);
        return { ...membership, label_id_code: fullLabel?.label_id || 'N/A' };
      });
      
      return {
        ...profile,
        user_labels: enrichedUserLabels,
        roles: roleMap.get(profile.id) || []
      };
    });

    setUsers(usersWithData);
    setLoading(false);
  };

  const toggleBanUser = async (userId: string, currentBanStatus: boolean) => {
    if (currentBanStatus) {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: false, ban_reason: null })
        .eq("id", userId);
      if (!error) {
        toast.success("User unbanned");
        fetchUsers();
      }
    } else {
      setSelectedUserId(userId);
      setBanDialogOpen(true);
    }
  };

  const confirmBan = async () => {
    if (!banReason.trim()) {
      toast.error("Please provide a ban reason");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: true, ban_reason: banReason.trim() })
      .eq("id", selectedUserId);
    if (!error) {
      toast.success("User banned");
      setBanDialogOpen(false);
      fetchUsers();
    }
  };

  const toggleLockUser = async (userId: string, currentLockStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_locked: !currentLockStatus })
      .eq("id", userId);
    if (!error) {
      toast.success(currentLockStatus ? "Account unlocked" : "Account locked");
      fetchUsers();
    }
  };

  const updateAccountType = async (userId: string, accountType: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ account_type: accountType })
      .eq("id", userId);
    if (!error) {
      toast.success(`Account type updated`);
      fetchUsers();
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Delete ${userEmail}? This cannot be undone.`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!error) {
        toast.success("User deleted");
        fetchUsers();
        setSelectedUser(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
  };

  const reverseStrike = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("strike_count")
      .eq("id", userId)
      .single();

    const currentStrikes = profile?.strike_count || 0;
    if (currentStrikes <= 0) {
      toast.error("No strikes to reverse");
      return;
    }

    const newStrikeCount = currentStrikes - 1;
    const { error } = await supabase
      .from("profiles")
      .update({ 
        strike_count: newStrikeCount,
        suspended_at: newStrikeCount < 3 ? null : undefined,
        suspension_reason: newStrikeCount < 3 ? null : undefined
      })
      .eq("id", userId);

    if (!error) {
      toast.success(`Strike reversed. Now at ${newStrikeCount}/3`);
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.user_id?.includes(searchQuery);
    
    const matchesTab = activeTab === "all" ||
      (activeTab === "labels" && u.account_type === "label") ||
      (activeTab === "artists" && u.account_type !== "label") ||
      (activeTab === "admins" && u.roles?.includes("admin"));
    
    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold">User Management</CardTitle>
        <CardDescription>Manage user accounts efficiently</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4 h-[600px]">
          {/* Left Panel - User List */}
          <div className="w-full lg:w-1/3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="labels" className="text-xs">Labels</TabsTrigger>
                <TabsTrigger value="artists" className="text-xs">Artists</TabsTrigger>
                <TabsTrigger value="admins" className="text-xs">Admins</TabsTrigger>
              </TabsList>
            </Tabs>

            <ScrollArea className="h-[480px] pr-2">
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full p-3 rounded-lg text-left transition-all flex items-center gap-3 ${
                      selectedUser?.id === user.id 
                        ? "bg-primary/20 border border-primary/30" 
                        : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {user.account_type === "label" ? (
                        <Building2 className="w-4 h-4 text-primary" />
                      ) : user.roles?.includes("admin") ? (
                        <Settings className="w-4 h-4 text-destructive" />
                      ) : (
                        <Music className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
                      <p className="text-xs text-muted-foreground truncate">ID: {user.user_id}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {user.is_banned && <Badge variant="destructive" className="text-[10px] px-1">Banned</Badge>}
                      {user.is_locked && <Badge variant="outline" className="text-[10px] px-1 border-yellow-500 text-yellow-500">Locked</Badge>}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - User Details */}
          <div className="flex-1 border-l border-border pl-4">
            {selectedUser ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedUser.full_name || "No name set"}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">User ID: {selectedUser.user_id}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedUser.roles?.includes("admin") && (
                      <Badge variant="destructive">Admin</Badge>
                    )}
                    {selectedUser.account_type === "label" ? (
                      <Badge className="bg-primary/20 text-primary">Label</Badge>
                    ) : (
                      <Badge variant="outline">Artist</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Account Type</Label>
                    <Select
                      value={selectedUser.account_type || "artist"}
                      onValueChange={(value) => updateAccountType(selectedUser.id, value)}
                      disabled={selectedUser.roles?.includes("admin")}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="artist">Artist</SelectItem>
                        <SelectItem value="label">Label</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="flex gap-2">
                      {selectedUser.is_banned ? (
                        <Badge variant="destructive" className="text-xs">Banned</Badge>
                      ) : selectedUser.is_locked ? (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">Locked</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                      )}
                      {selectedUser.strike_count > 0 && (
                        <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                          {selectedUser.strike_count}/3 Strikes
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {selectedUser.label_name && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <Label className="text-xs text-muted-foreground">Label</Label>
                    <p className="text-sm font-medium">{selectedUser.label_name}</p>
                    {selectedUser.user_labels?.[0]?.label_id_code && (
                      <p className="text-xs text-muted-foreground">ID: {selectedUser.user_labels[0].label_id_code}</p>
                    )}
                  </div>
                )}

                {!selectedUser.roles?.includes("admin") && (
                  <>
                    <div className="border-t border-border pt-4 space-y-2">
                      <h4 className="text-sm font-medium">Quick Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleBanUser(selectedUser.id, selectedUser.is_banned)}
                          className={selectedUser.is_banned ? "border-green-500/30 text-green-500" : "border-destructive/30 text-destructive"}
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          {selectedUser.is_banned ? "Unban" : "Ban"}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLockUser(selectedUser.id, selectedUser.is_locked)}
                        >
                          {selectedUser.is_locked ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                          {selectedUser.is_locked ? "Unlock" : "Lock"}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await supabase.from("profiles").update({ onboarding_completed: false }).eq("id", selectedUser.id);
                            toast.success("Tutorial reset");
                          }}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reset Tutorial
                        </Button>

                        {(selectedUser.strike_count || 0) > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reverseStrike(selectedUser.id)}
                            className="border-yellow-500/30 text-yellow-500"
                          >
                            <MinusCircle className="w-3 h-3 mr-1" />
                            Reverse Strike
                          </Button>
                        )}

                        <SendNotificationDialog userId={selectedUser.id} userName={selectedUser.full_name || selectedUser.email} />

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteUser(selectedUser.id, selectedUser.email)}
                          className="border-destructive/30 text-destructive"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a user to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ban Dialog */}
        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-destructive">Ban User</DialogTitle>
              <DialogDescription>Provide a reason for the ban.</DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Ban reason..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button onClick={confirmBan} className="flex-1 bg-destructive" disabled={!banReason.trim()}>
                Confirm Ban
              </Button>
              <Button onClick={() => setBanDialogOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CompactUserManagement;
