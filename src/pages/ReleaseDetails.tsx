import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Calendar, Music, User, Hash, Building2 } from "lucide-react";
import { toast } from "sonner";
import { DistributionHistory } from "@/components/DistributionHistory";

const ReleaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [release, setRelease] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelease();
  }, [id]);

  const fetchRelease = async () => {
    const { data, error } = await supabase
      .from("releases")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Failed to load release");
      navigate("/dashboard");
      return;
    }

    setRelease(data);
    setLoading(false);
  };

  const requestTakedown = async () => {
    const { error } = await supabase
      .from("releases")
      .update({ takedown_requested: true })
      .eq("id", id);

    if (error) {
      toast.error("Failed to request takedown");
      return;
    }

    toast.success("Takedown requested - admin will process this shortly");
    fetchRelease();
  };

  const deleteRelease = async () => {
    // Check if release is pending
    if (release?.status === "pending") {
      toast.error("Cannot delete releases with pending status");
      return;
    }

    // Check if release is approved/delivered - require takedown first
    const deliveredStatuses = ["approved", "delivering"];
    if (deliveredStatuses.includes(release?.status)) {
      if (!confirm("This release is live. You must request takedown before deleting. Request takedown now?")) {
        return;
      }
      await requestTakedown();
      return;
    }

    // For all other statuses (rejected, taken down, striked, on hold), allow direct deletion
    if (!confirm("Are you sure you want to delete this release? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from("releases")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete release");
      return;
    }

    toast.success("Release deleted successfully");
    navigate("/dashboard");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      approved: "bg-green-500/20 text-green-300 border-green-500/30",
      rejected: "bg-red-500/20 text-red-300 border-red-500/30",
      published: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      "taken down": "bg-gray-500/20 text-gray-300 border-gray-500/30",
      delivering: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      striked: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      "on hold": "bg-purple-500/20 text-purple-300 border-purple-500/30",
    };

    return (
      <Badge variant="outline" className={variants[status] || variants.pending}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {release?.artwork_url ? (
                  <img
                    src={release.artwork_url}
                    alt={release.title}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center">
                    <Music className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-3xl mb-2 text-left">{release?.title}</CardTitle>
                    <CardDescription className="text-lg text-left">{release?.artist_name}</CardDescription>
                  </div>
                  {getStatusBadge(release?.status || "pending")}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {release?.release_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Release Date</p>
                        <p className="font-medium">
                          {new Date(release.release_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {release?.genre && (
                    <div className="flex items-center gap-3">
                      <Music className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Genre</p>
                        <p className="font-medium">{release.genre}</p>
                      </div>
                    </div>
                  )}
                  {release?.label_name && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Label</p>
                        <p className="font-medium">{release.label_name}</p>
                      </div>
                    </div>
                  )}
                  {release?.isrc && (
                    <div className="flex items-center gap-3">
                      <Hash className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">ISRC</p>
                        <p className="font-medium">{release.isrc}</p>
                      </div>
                    </div>
                  )}
                  {release?.upc && (
                    <div className="flex items-center gap-3">
                      <Hash className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">UPC</p>
                        <p className="font-medium">{release.upc}</p>
                      </div>
                    </div>
                  )}
                  {release?.catalog_number && (
                    <div className="flex items-center gap-3">
                      <Hash className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Catalog #</p>
                        <p className="font-medium">{release.catalog_number}</p>
                      </div>
                    </div>
                  )}
                  {release?.distributor && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Distributor</p>
                        <p className="font-medium">{release.distributor}</p>
                      </div>
                    </div>
                  )}
                </div>

                {release?.featured_artists && release.featured_artists.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Featured Artists</p>
                    <div className="flex flex-wrap gap-2">
                      {release.featured_artists.map((artist: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {artist}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {release?.copyright_line && (
                  <div>
                    <p className="text-sm text-muted-foreground">Copyright</p>
                    <p className="text-sm">{release.copyright_line}</p>
                  </div>
                )}

                {release?.phonographic_line && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phonographic</p>
                    <p className="text-sm">{release.phonographic_line}</p>
                  </div>
                )}

                {release?.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{release.notes}</p>
                  </div>
                )}

                {release?.rejection_reason && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-1">Rejection Reason</p>
                    <p className="text-sm text-destructive/90">{release.rejection_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-left text-destructive">Danger Zone</CardTitle>
                <CardDescription className="text-left">Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {release?.status !== "pending" && (
                  <Button
                    variant="destructive"
                    onClick={deleteRelease}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Release
                  </Button>
                )}
                {release?.status === "pending" && (
                  <p className="text-sm text-muted-foreground">
                    Releases with pending status cannot be deleted
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Distribution History */}
            <DistributionHistory releaseId={id!} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReleaseDetails;
