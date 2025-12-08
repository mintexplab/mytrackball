import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles, Plus, Search, Music, XCircle } from "lucide-react";
import { format } from "date-fns";

interface TrackAllowanceUser {
  id: string;
  user_id: string;
  month_year: string;
  track_count: number;
  tracks_allowed: number;
  subscription_id: string | null;
  updated_at: string;
  profile?: {
    email: string;
    full_name: string | null;
    display_name: string | null;
  };
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
}

export const TrackAllowanceAdminManagement = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<TrackAllowanceUser[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [granting, setGranting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [tracksPerMonth, setTracksPerMonth] = useState(10);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<TrackAllowanceUser | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all track allowance usage with user profiles
      const { data: usageData, error: usageError } = await supabase
        .from("track_allowance_usage")
        .select("*")
        .order("updated_at", { ascending: false });

      if (usageError) throw usageError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, display_name");

      if (profilesError) throw profilesError;

      // Map profiles to usage data
      const usersWithProfiles = usageData?.map(usage => {
        const profile = profilesData?.find(p => p.id === usage.user_id);
        return {
          ...usage,
          profile: profile || undefined,
        };
      }) || [];

      setUsers(usersWithProfiles);
      setAllProfiles(profilesData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch track allowance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGrantAllowance = async () => {
    if (!selectedUserId || tracksPerMonth < 5) {
      toast.error("Please select a user and enter valid tracks per month (min 5)");
      return;
    }

    setGranting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("grant-track-allowance", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          userId: selectedUserId,
          tracksPerMonth,
        },
      });

      if (error) throw error;

      toast.success(`Successfully granted ${tracksPerMonth} tracks/month`);
      setGrantDialogOpen(false);
      setSelectedUserId("");
      setTracksPerMonth(10);
      fetchData();
    } catch (error: any) {
      console.error("Error granting allowance:", error);
      toast.error(error.message || "Failed to grant track allowance");
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeAllowance = async () => {
    if (!userToRevoke) return;

    setRevoking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("revoke-track-allowance", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          userId: userToRevoke.user_id,
          subscriptionId: userToRevoke.subscription_id,
        },
      });

      if (error) throw error;

      toast.success("Track allowance revoked successfully");
      setRevokeDialogOpen(false);
      setUserToRevoke(null);
      fetchData();
    } catch (error: any) {
      console.error("Error revoking allowance:", error);
      toast.error(error.message || "Failed to revoke track allowance");
    } finally {
      setRevoking(false);
    }
  };

  const openRevokeDialog = (user: TrackAllowanceUser) => {
    setUserToRevoke(user);
    setRevokeDialogOpen(true);
  };

  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.profile?.email?.toLowerCase().includes(search) ||
      user.profile?.full_name?.toLowerCase().includes(search) ||
      user.profile?.display_name?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Track Allowance Subscriptions
              </CardTitle>
              <CardDescription>
                View and manage all users' track allowance subscriptions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Grant Allowance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Grant Track Allowance</DialogTitle>
                    <DialogDescription>
                      Grant a free track allowance subscription to a user
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select User</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allProfiles.map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.email} {profile.full_name ? `(${profile.full_name})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tracks Per Month</Label>
                      <Input
                        type="number"
                        min={5}
                        max={100}
                        value={tracksPerMonth}
                        onChange={(e) => setTracksPerMonth(Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        {tracksPerMonth > 45 ? "$2" : "$4"} CAD per track (free for granted subscriptions)
                      </p>
                    </div>
                    <Button
                      onClick={handleGrantAllowance}
                      disabled={granting || !selectedUserId}
                      className="w-full"
                    >
                      {granting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Granting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Grant {tracksPerMonth} Tracks/Month
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground">Total Subscriptions</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground">Total Tracks Used</p>
              <p className="text-2xl font-bold">{users.reduce((sum, u) => sum + u.track_count, 0)}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground">Total Tracks Allowed</p>
              <p className="text-2xl font-bold">{users.reduce((sum, u) => sum + u.tracks_allowed, 0)}</p>
            </div>
          </div>

          {/* Users List */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No users found matching your search" : "No track allowance subscriptions yet"}
              </div>
            ) : (
              filteredUsers.map(user => {
                const usagePercentage = user.tracks_allowed > 0
                  ? (user.track_count / user.tracks_allowed) * 100
                  : 0;
                const isOverLimit = user.track_count >= user.tracks_allowed;

                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-lg border transition-all ${
                      isOverLimit
                        ? 'bg-destructive/10 border-destructive/30'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{user.profile?.email || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.profile?.full_name || user.profile?.display_name || 'No name set'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isOverLimit ? "destructive" : "secondary"}>
                          {user.month_year}
                        </Badge>
                        {user.subscription_id && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Active
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRevokeDialog(user)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          <span className="font-bold">{user.track_count}</span>
                          <span className="text-muted-foreground"> / {user.tracks_allowed} tracks</span>
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Updated {format(new Date(user.updated_at), "MMM d, h:mm a")}
                      </span>
                    </div>

                    <Progress
                      value={Math.min(usagePercentage, 100)}
                      className={`h-2 ${isOverLimit ? '[&>div]:bg-destructive' : ''}`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Track Allowance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the track allowance for{" "}
              <strong>{userToRevoke?.profile?.email}</strong>? This will cancel their subscription
              and remove their current month's allowance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAllowance}
              disabled={revoking}
              className="bg-destructive hover:bg-destructive/90"
            >
              {revoking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Allowance"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
