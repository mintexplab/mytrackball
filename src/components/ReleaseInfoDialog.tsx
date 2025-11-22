import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Music, Calendar, Tag, User, Building2, FileText } from "lucide-react";
import { toast } from "sonner";
import { AudioPlayer } from "./AudioPlayer";

interface ReleaseInfoDialogProps {
  releaseId: string;
}

const ReleaseInfoDialog = ({ releaseId }: ReleaseInfoDialogProps) => {
  const [open, setOpen] = useState(false);
  const [release, setRelease] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchReleaseData();
    }
  }, [open, releaseId]);

  const fetchReleaseData = async () => {
    setLoading(true);
    try {
      const { data: releaseData, error: releaseError } = await supabase
        .from("releases")
        .select("*")
        .eq("id", releaseId)
        .single();

      if (releaseError) throw releaseError;

      const { data: tracksData, error: tracksError } = await supabase
        .from("tracks")
        .select("*")
        .eq("release_id", releaseId)
        .order("track_number");

      if (tracksError) throw tracksError;

      setRelease(releaseData);
      setTracks(tracksData || []);
    } catch (error: any) {
      toast.error("Failed to load release information");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="w-4 h-4 mr-2" />
          Information
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-bold">RELEASE INFORMATION</DialogTitle>
          <DialogDescription>Complete details for this release</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : release ? (
          <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
            <div className="space-y-6">
              {/* Artwork and Basic Info */}
              <div className="flex gap-6">
                {release.artwork_url && (
                  <img
                    src={release.artwork_url}
                    alt={release.title}
                    className="w-48 h-48 rounded-lg object-cover border border-border"
                  />
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-2xl font-bold">{release.title}</h3>
                    <p className="text-lg text-muted-foreground">{release.artist_name}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="w-3 h-3" />
                      {release.release_date || "No date"}
                    </Badge>
                    {release.genre && (
                      <Badge variant="outline" className="gap-1">
                        <Tag className="w-3 h-3" />
                        {release.genre}
                      </Badge>
                    )}
                    <Badge variant="outline" className="gap-1">
                      <Music className="w-3 h-3" />
                      {tracks.length} {tracks.length === 1 ? "Track" : "Tracks"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Audio Player */}
              {release.audio_file_url && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-bold text-lg">AUDIO PREVIEW</h4>
                    <AudioPlayer
                      src={release.audio_file_url}
                      title={release.title}
                      artist={release.artist_name}
                    />
                  </div>
                </>
              )}

              <Separator />

              {/* Release Details */}
              <div className="space-y-4">
                <h4 className="font-bold text-lg">RELEASE DETAILS</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {release.upc && (
                    <div>
                      <p className="text-sm text-muted-foreground">UPC/EAN</p>
                      <p className="font-medium">{release.upc}</p>
                    </div>
                  )}
                  {release.label_name && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Label
                      </p>
                      <p className="font-medium">{release.label_name}</p>
                    </div>
                  )}
                  {release.distributor && (
                    <div>
                      <p className="text-sm text-muted-foreground">Distributor</p>
                      <p className="font-medium">{release.distributor}</p>
                    </div>
                  )}
                  {release.featured_artists && release.featured_artists.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Featured Artists
                      </p>
                      <p className="font-medium">{release.featured_artists.join(", ")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Copyright Info */}
              {(release.copyright_line || release.phonographic_line || release.courtesy_line) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-bold text-lg">COPYRIGHT & CREDITS</h4>
                    {release.copyright_line && (
                      <div>
                        <p className="text-sm text-muted-foreground">Copyright Line</p>
                        <p className="font-medium">{release.copyright_line}</p>
                      </div>
                    )}
                    {release.phonographic_line && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phonographic Line</p>
                        <p className="font-medium">{release.phonographic_line}</p>
                      </div>
                    )}
                    {release.courtesy_line && (
                      <div>
                        <p className="text-sm text-muted-foreground">Courtesy Line</p>
                        <p className="font-medium">{release.courtesy_line}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Multi-disc Info */}
              {release.is_multi_disc && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-bold text-lg">MULTI-DISC INFORMATION</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Disc Number</p>
                        <p className="font-medium">{release.disc_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Discs</p>
                        <p className="font-medium">{release.total_discs}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Volume Number</p>
                        <p className="font-medium">{release.volume_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Volumes</p>
                        <p className="font-medium">{release.total_volumes}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Tracks */}
              <Separator />
              <div className="space-y-3">
                <h4 className="font-bold text-lg">TRACKLIST</h4>
                <div className="space-y-2">
                  {tracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-sm text-muted-foreground w-8">
                          {track.track_number}.
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{track.title}</p>
                          {track.featured_artists && track.featured_artists.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              feat. {track.featured_artists.join(", ")}
                            </p>
                          )}
                          {track.isrc && (
                            <p className="text-xs text-muted-foreground">ISRC: {track.isrc}</p>
                          )}
                        </div>
                      </div>
                      {track.duration && (
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(track.duration)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {release.notes && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      ADDITIONAL NOTES
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {release.notes}
                    </p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-center py-8 text-muted-foreground">No release data found</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReleaseInfoDialog;
