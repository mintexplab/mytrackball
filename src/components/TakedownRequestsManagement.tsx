import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Music, Calendar, User, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Release {
  id: string;
  title: string;
  artist_name: string;
  status: string;
  release_date: string;
  artwork_url: string;
  genre: string;
  user_id: string;
  takedown_requested: boolean;
  created_at: string;
  notes: string | null;
}

interface Profile {
  email: string;
  display_name: string;
  user_id: string;
}

export const TakedownRequestsManagement = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchTakedownRequests();
  }, []);

  const fetchTakedownRequests = async () => {
    setLoading(true);
    try {
      // Fetch all releases with takedown_requested = true
      const { data: releasesData, error: releasesError } = await supabase
        .from("releases")
        .select("*")
        .eq("takedown_requested", true)
        .order("created_at", { ascending: false });

      if (releasesError) throw releasesError;

      setReleases(releasesData || []);

      // Fetch user profiles for all releases
      if (releasesData && releasesData.length > 0) {
        const userIds = [...new Set(releasesData.map(r => r.user_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, display_name, user_id")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        const profilesMap: Record<string, Profile> = {};
        profilesData?.forEach((profile) => {
          profilesMap[profile.id] = profile as Profile;
        });
        setProfiles(profilesMap);
      }
    } catch (error: any) {
      toast.error("Failed to load takedown requests");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessTakedown = async (approved: boolean) => {
    if (!selectedRelease) return;

    setActionLoading(true);
    try {
      // Update release status based on admin decision
      const updateData: any = {
        takedown_requested: false,
      };

      if (approved) {
        // Admin approved takedown - set status to "taken down"
        updateData.status = "taken down";
        
        // TODO: When MusicDASH API is ready, call the takedown edge function here
        // await supabase.functions.invoke('musicdash-takedown', {
        //   body: { release_id: selectedRelease.id }
        // });
      } else {
        // Admin denied takedown - keep current status
        // Optionally add admin notes to the release
        if (adminNotes) {
          updateData.notes = (selectedRelease.notes || "") + "\n\nAdmin note: " + adminNotes;
        }
      }

      const { error } = await supabase
        .from("releases")
        .update(updateData)
        .eq("id", selectedRelease.id);

      if (error) throw error;

      // Send notification to user
      const profile = profiles[selectedRelease.user_id];
      if (profile) {
        await supabase.from("notifications").insert({
          user_id: selectedRelease.user_id,
          title: approved ? "Takedown Request Approved" : "Takedown Request Denied",
          message: approved 
            ? `Your takedown request for "${selectedRelease.title}" has been processed. The release has been taken down.`
            : `Your takedown request for "${selectedRelease.title}" has been denied. ${adminNotes || "Contact support for more information."}`,
          type: approved ? "success" : "warning",
        });
      }

      toast.success(approved ? "Takedown processed successfully" : "Takedown request denied");
      setSelectedRelease(null);
      setAdminNotes("");
      fetchTakedownRequests();
    } catch (error: any) {
      toast.error("Failed to process takedown");
      console.error(error);
    } finally {
      setActionLoading(false);
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
    <>
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">TAKEDOWN REQUESTS</CardTitle>
          <CardDescription>
            Manage user takedown requests for distributed releases
          </CardDescription>
        </CardHeader>
        <CardContent>
          {releases.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No pending takedown requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {releases.map((release) => {
                const profile = profiles[release.user_id];
                return (
                  <Card key={release.id} className="border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {release.artwork_url && (
                          <img
                            src={release.artwork_url}
                            alt={release.title}
                            className="w-20 h-20 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg truncate">{release.title}</h3>
                              <p className="text-sm text-muted-foreground">{release.artist_name}</p>
                            </div>
                            <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                              {release.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {profile?.display_name || profile?.email} (ID: {profile?.user_id})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {new Date(release.release_date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Music className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{release.genre}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedRelease(release);
                                setAdminNotes("");
                              }}
                              className="bg-gradient-primary"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Process Request
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Takedown Dialog */}
      <Dialog open={!!selectedRelease} onOpenChange={() => setSelectedRelease(null)}>
        <DialogContent className="sm:max-w-[500px] bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle>Process Takedown Request</DialogTitle>
            <DialogDescription>
              Review and process the takedown request for this release
            </DialogDescription>
          </DialogHeader>

          {selectedRelease && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="font-semibold">{selectedRelease.title}</p>
                <p className="text-sm text-muted-foreground">{selectedRelease.artist_name}</p>
                <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                  {selectedRelease.status}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes or reason for denial..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">MusicDASH API Integration</p>
                <p className="text-xs text-muted-foreground">
                  When you approve this takedown, the system will be ready to call the MusicDASH API
                  to remove this release from all DSPs. Integration pending API confirmation.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleProcessTakedown(false)}
              disabled={actionLoading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Deny Takedown
            </Button>
            <Button
              variant="default"
              onClick={() => handleProcessTakedown(true)}
              disabled={actionLoading}
              className="bg-gradient-primary"
            >
              {actionLoading ? (
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-b-2 border-white" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Approve Takedown
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
