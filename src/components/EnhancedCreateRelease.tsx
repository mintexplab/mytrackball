import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Music } from "lucide-react";
import { z } from "zod";

interface EnhancedCreateReleaseProps {
  children: React.ReactNode;
}

interface Track {
  id: string;
  track_number: number;
  title: string;
  duration: string;
  isrc: string;
  audio_file_url: string;
  featured_artists: string;
}

const releaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  artist_name: z.string().trim().min(1, "Artist name is required").max(200, "Artist name must be less than 200 characters"),
  release_date: z.string().optional(),
  genre: z.string().trim().max(100, "Genre must be less than 100 characters").optional(),
  artwork_url: z.string().trim().url("Must be a valid URL").max(500, "URL too long").optional().or(z.literal("")),
  copyright_line: z.string().trim().max(200, "Copyright line must be less than 200 characters").optional(),
  phonographic_line: z.string().trim().max(200, "Phonographic line must be less than 200 characters").optional(),
  featured_artists: z.string().trim().max(500, "Featured artists must be less than 500 characters").optional(),
  courtesy_line: z.string().trim().max(200, "Courtesy line must be less than 200 characters").optional(),
  is_multi_disc: z.boolean(),
  disc_number: z.number().int().min(1).max(99),
  volume_number: z.number().int().min(1).max(99),
  total_discs: z.number().int().min(1).max(99),
  total_volumes: z.number().int().min(1).max(99),
  notes: z.string().trim().max(2000, "Notes must be less than 2000 characters").optional(),
});

const trackSchema = z.object({
  title: z.string().trim().min(1, "Track title is required").max(200, "Track title must be less than 200 characters"),
  duration: z.string().optional(),
  isrc: z.string().trim().max(20, "ISRC must be less than 20 characters").optional(),
  audio_file_url: z.string().trim().url("Must be a valid URL").max(500, "URL too long").optional().or(z.literal("")),
  featured_artists: z.string().trim().max(500, "Featured artists must be less than 500 characters").optional(),
});

const EnhancedCreateRelease = ({ children }: EnhancedCreateReleaseProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([{
    id: "1",
    track_number: 1,
    title: "",
    duration: "",
    isrc: "",
    audio_file_url: "",
    featured_artists: "",
  }]);
  const [formData, setFormData] = useState({
    title: "",
    artist_name: "",
    release_date: "",
    genre: "",
    artwork_url: "",
    copyright_line: "",
    phonographic_line: "",
    featured_artists: "",
    courtesy_line: "",
    is_multi_disc: false,
    disc_number: 1,
    volume_number: 1,
    total_discs: 1,
    total_volumes: 1,
    notes: "",
  });

  const addTrack = () => {
    setTracks([...tracks, {
      id: Date.now().toString(),
      track_number: tracks.length + 1,
      title: "",
      duration: "",
      isrc: "",
      audio_file_url: "",
      featured_artists: "",
    }]);
  };

  const removeTrack = (id: string) => {
    if (tracks.length > 1) {
      setTracks(tracks.filter(t => t.id !== id).map((t, idx) => ({ ...t, track_number: idx + 1 })));
    }
  };

  const updateTrack = (id: string, field: keyof Track, value: string | number) => {
    setTracks(tracks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate release data
      const validatedRelease = releaseSchema.parse(formData);

      // Validate all tracks
      for (const track of tracks) {
        trackSchema.parse({
          title: track.title,
          duration: track.duration,
          isrc: track.isrc,
          audio_file_url: track.audio_file_url,
          featured_artists: track.featured_artists,
        });
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create release
      const { data: release, error: releaseError } = await supabase
        .from("releases")
        .insert({
          user_id: user.id,
          title: validatedRelease.title,
          artist_name: validatedRelease.artist_name,
          release_date: validatedRelease.release_date || null,
          genre: validatedRelease.genre || null,
          artwork_url: validatedRelease.artwork_url || null,
          copyright_line: validatedRelease.copyright_line || null,
          phonographic_line: validatedRelease.phonographic_line || null,
          courtesy_line: validatedRelease.courtesy_line || null,
          featured_artists: validatedRelease.featured_artists ? validatedRelease.featured_artists.split(",").map(a => a.trim()) : [],
          is_multi_disc: validatedRelease.is_multi_disc,
          disc_number: validatedRelease.disc_number,
          volume_number: validatedRelease.volume_number,
          total_discs: validatedRelease.total_discs,
          total_volumes: validatedRelease.total_volumes,
          notes: validatedRelease.notes || null,
        })
        .select()
        .single();

      if (releaseError) throw releaseError;

      // Create tracks
      const tracksData = tracks.map(track => ({
        release_id: release.id,
        track_number: track.track_number,
        title: track.title,
        duration: track.duration ? parseInt(track.duration) : null,
        isrc: track.isrc,
        audio_file_url: track.audio_file_url,
        featured_artists: track.featured_artists ? track.featured_artists.split(",").map(a => a.trim()) : [],
      }));

      const { error: tracksError } = await supabase
        .from("tracks")
        .insert(tracksData);

      if (tracksError) throw tracksError;

      toast.success("Release submitted for review!");
      setOpen(false);
      resetForm();
      window.location.reload();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      artist_name: "",
      release_date: "",
      genre: "",
      artwork_url: "",
      copyright_line: "",
      phonographic_line: "",
      featured_artists: "",
      courtesy_line: "",
      is_multi_disc: false,
      disc_number: 1,
      volume_number: 1,
      total_discs: 1,
      total_volumes: 1,
      notes: "",
    });
    setTracks([{
      id: "1",
      track_number: 1,
      title: "",
      duration: "",
      isrc: "",
      audio_file_url: "",
      featured_artists: "",
    }]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Release</DialogTitle>
          <DialogDescription>
            Submit your music for distribution with complete metadata
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="p-4 border-border">
            <h3 className="font-semibold mb-4 text-primary">Release Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="title">Album/EP/Single Title *</Label>
                  <Input
                    id="title"
                    placeholder="My Awesome Release"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist_name">Primary Artist *</Label>
                  <Input
                    id="artist_name"
                    placeholder="DJ Example"
                    value={formData.artist_name}
                    onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })}
                    required
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="featured_artists">Featured Artists</Label>
                  <Input
                    id="featured_artists"
                    placeholder="Artist 1, Artist 2"
                    value={formData.featured_artists}
                    onChange={(e) => setFormData({ ...formData, featured_artists: e.target.value })}
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="release_date">Release Date</Label>
                  <Input
                    id="release_date"
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    placeholder="Electronic, Hip-Hop, etc."
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="artwork_url">Artwork URL</Label>
                  <Input
                    id="artwork_url"
                    placeholder="https://example.com/artwork.jpg"
                    value={formData.artwork_url}
                    onChange={(e) => setFormData({ ...formData, artwork_url: e.target.value })}
                    className="bg-background/50 border-border"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Copyright Info */}
          <Card className="p-4 border-border">
            <h3 className="font-semibold mb-4 text-primary">Copyright & Credits</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="copyright_line">© Copyright Line</Label>
                <Input
                  id="copyright_line"
                  placeholder="© 2024 Your Name"
                  value={formData.copyright_line}
                  onChange={(e) => setFormData({ ...formData, copyright_line: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phonographic_line">℗ Phonographic Line</Label>
                <Input
                  id="phonographic_line"
                  placeholder="℗ 2024 Your Label"
                  value={formData.phonographic_line}
                  onChange={(e) => setFormData({ ...formData, phonographic_line: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courtesy_line">Courtesy Line</Label>
                <Input
                  id="courtesy_line"
                  placeholder="Courtesy of..."
                  value={formData.courtesy_line}
                  onChange={(e) => setFormData({ ...formData, courtesy_line: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>
            </div>
          </Card>

          {/* Multi-disc/Volume Options */}
          <Card className="p-4 border-border">
            <h3 className="font-semibold mb-4 text-primary">Multi-Disc/Volume Release</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_multi_disc"
                  checked={formData.is_multi_disc}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_multi_disc: checked as boolean })}
                />
                <Label htmlFor="is_multi_disc">This is a multi-disc or multi-volume release</Label>
              </div>

              {formData.is_multi_disc && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="disc_number">Disc Number</Label>
                    <Input
                      id="disc_number"
                      type="number"
                      min="1"
                      value={formData.disc_number}
                      onChange={(e) => setFormData({ ...formData, disc_number: parseInt(e.target.value) })}
                      className="bg-background/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_discs">Total Discs</Label>
                    <Input
                      id="total_discs"
                      type="number"
                      min="1"
                      value={formData.total_discs}
                      onChange={(e) => setFormData({ ...formData, total_discs: parseInt(e.target.value) })}
                      className="bg-background/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="volume_number">Volume Number</Label>
                    <Input
                      id="volume_number"
                      type="number"
                      min="1"
                      value={formData.volume_number}
                      onChange={(e) => setFormData({ ...formData, volume_number: parseInt(e.target.value) })}
                      className="bg-background/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_volumes">Total Volumes</Label>
                    <Input
                      id="total_volumes"
                      type="number"
                      min="1"
                      value={formData.total_volumes}
                      onChange={(e) => setFormData({ ...formData, total_volumes: parseInt(e.target.value) })}
                      className="bg-background/50 border-border"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Tracks */}
          <Card className="p-4 border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-primary">Tracks</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTrack}
                className="border-primary/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Track
              </Button>
            </div>
            
            <div className="space-y-4">
              {tracks.map((track, index) => (
                <Card key={track.id} className="p-4 border-border/50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-primary" />
                      <span className="font-medium">Track {track.track_number}</span>
                    </div>
                    {tracks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTrack(track.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor={`track-title-${track.id}`}>Track Title *</Label>
                      <Input
                        id={`track-title-${track.id}`}
                        placeholder="Song Name"
                        value={track.title}
                        onChange={(e) => updateTrack(track.id, "title", e.target.value)}
                        required
                        className="bg-background/50 border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`track-duration-${track.id}`}>Duration (seconds)</Label>
                      <Input
                        id={`track-duration-${track.id}`}
                        type="number"
                        placeholder="180"
                        value={track.duration}
                        onChange={(e) => updateTrack(track.id, "duration", e.target.value)}
                        className="bg-background/50 border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`track-isrc-${track.id}`}>ISRC Code</Label>
                      <Input
                        id={`track-isrc-${track.id}`}
                        placeholder="USRC17607839"
                        value={track.isrc}
                        onChange={(e) => updateTrack(track.id, "isrc", e.target.value)}
                        className="bg-background/50 border-border"
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor={`track-audio-${track.id}`}>Audio File URL</Label>
                      <Input
                        id={`track-audio-${track.id}`}
                        placeholder="https://example.com/track.mp3"
                        value={track.audio_file_url}
                        onChange={(e) => updateTrack(track.id, "audio_file_url", e.target.value)}
                        className="bg-background/50 border-border"
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor={`track-featured-${track.id}`}>Featured Artists</Label>
                      <Input
                        id={`track-featured-${track.id}`}
                        placeholder="Artist 1, Artist 2"
                        value={track.featured_artists}
                        onChange={(e) => updateTrack(track.id, "featured_artists", e.target.value)}
                        className="bg-background/50 border-border"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements or information..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-background/50 border-border min-h-[100px]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              {loading ? "Submitting..." : "Submit Release"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedCreateRelease;
