import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus, Trash2, Music, Upload } from "lucide-react";
import { z } from "zod";
import { useS3Upload } from "@/hooks/useS3Upload";

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
  label_name: z.string().trim().min(1, "Label name is required").max(200, "Label name must be less than 200 characters"),
  artwork_url: z.string().trim().url("Must be a valid URL").max(500, "URL too long").optional().or(z.literal("")),
  copyright_line: z.string().trim().min(1, "Copyright line (C-Line) is required").max(200, "Copyright line must be less than 200 characters"),
  phonographic_line: z.string().trim().min(1, "Phonographic line (P-Line) is required").max(200, "Phonographic line must be less than 200 characters"),
  featured_artists: z.string().trim().max(500, "Featured artists must be less than 500 characters").optional(),
  notes: z.string().trim().max(2000, "Notes must be less than 2000 characters").optional(),
  catalog_number: z.string().trim().max(100, "Catalog number must be less than 100 characters").optional(),
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
  const [releaseType, setReleaseType] = useState<"single" | "album">("single");
  const { uploadFile, uploading: s3Uploading } = useS3Upload();
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
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
    label_name: "",
    artwork_url: "",
    copyright_line: "",
    phonographic_line: "",
    featured_artists: "",
    notes: "",
    catalog_number: "",
  });

  const generateISRC = async () => {
    try {
      const { data: counter, error } = await supabase
        .from("isrc_counter")
        .select("*")
        .single();

      if (error) throw error;

      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = `CBGNR${year}`;
      const nextNumber = (counter.last_number + 1).toString().padStart(5, "0");
      const newIsrc = `${prefix}${nextNumber}`;

      await supabase
        .from("isrc_counter")
        .update({ last_number: counter.last_number + 1 })
        .eq("id", counter.id);

      return newIsrc;
    } catch (error) {
      console.error("Error generating ISRC:", error);
      throw new Error("Failed to generate ISRC");
    }
  };

  const autoGenerateISRCs = async () => {
    try {
      const updatedTracks = await Promise.all(
        tracks.map(async (track) => {
          if (!track.isrc) {
            const isrc = await generateISRC();
            return { ...track, isrc };
          }
          return track;
        })
      );
      setTracks(updatedTracks);
      toast.success("ISRCs generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate ISRCs");
    }
  };

  const addTrack = async () => {
    const newIsrc = await generateISRC();
    setTracks([...tracks, {
      id: Date.now().toString(),
      track_number: tracks.length + 1,
      title: "",
      duration: "",
      isrc: newIsrc,
      audio_file_url: "",
      featured_artists: "",
    }]);
    toast.success(`Track added with ISRC: ${newIsrc}`);
  };

  const removeTrack = (id: string) => {
    if (tracks.length > 1) {
      setTracks(tracks.filter(t => t.id !== id).map((t, idx) => ({ ...t, track_number: idx + 1 })));
    }
  };

  const updateTrack = (id: string, field: keyof Track, value: string | number) => {
    setTracks(tracks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleArtworkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG, or WEBP)');
      return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10485760) {
      toast.error('Artwork file must be less than 10MB');
      return;
    }
    
    setArtworkFile(file);
    toast.success('Artwork ready to upload');
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

      // Upload artwork to S3 if file is selected
      let artworkUrl = validatedRelease.artwork_url || null;
      if (artworkFile) {
        const timestamp = Date.now();
        const fileExt = artworkFile.name.split('.').pop();
        const s3Path = `release-artwork/${user.id}/${timestamp}.${fileExt}`;
        
        const uploadedUrl = await uploadFile({ file: artworkFile, path: s3Path });
        if (uploadedUrl) {
          artworkUrl = uploadedUrl;
        } else {
          throw new Error('Failed to upload artwork');
        }
      }

      // Create release
      const { data: release, error: releaseError } = await supabase
        .from("releases")
        .insert({
          user_id: user.id,
          title: validatedRelease.title,
          artist_name: validatedRelease.artist_name,
          release_date: validatedRelease.release_date || null,
          genre: validatedRelease.genre || null,
          label_name: validatedRelease.label_name,
          artwork_url: artworkUrl,
          copyright_line: validatedRelease.copyright_line,
          phonographic_line: validatedRelease.phonographic_line,
          featured_artists: validatedRelease.featured_artists ? validatedRelease.featured_artists.split(",").map(a => a.trim()) : [],
          notes: validatedRelease.notes || null,
          catalog_number: validatedRelease.catalog_number || null,
          isrc: tracks[0]?.isrc || null, // Save first track's ISRC to release
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
      label_name: "",
      artwork_url: "",
      copyright_line: "",
      phonographic_line: "",
      featured_artists: "",
      notes: "",
      catalog_number: "",
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
    setArtworkFile(null);
    setReleaseType("single");
  };

  // Auto-generate ISRC for first track on mount
  useEffect(() => {
    if (tracks[0] && !tracks[0].isrc) {
      generateISRC().then(isrc => {
        updateTrack(tracks[0].id, "isrc", isrc);
      }).catch(err => {
        console.error("Failed to generate initial ISRC:", err);
      });
    }
  }, []);

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
          {/* Release Type Selection */}
          <Card className="p-4 border-border">
            <h3 className="font-semibold mb-4 text-primary">Release Type</h3>
            <RadioGroup value={releaseType} onValueChange={(value) => setReleaseType(value as "single" | "album")}>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="cursor-pointer">Single</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="album" id="album" />
                  <Label htmlFor="album" className="cursor-pointer">Album</Label>
                </div>
              </div>
            </RadioGroup>
          </Card>

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
                    <Label htmlFor="label_name">Label Name *</Label>
                    <Input
                      id="label_name"
                      placeholder="Your Label Name"
                      value={formData.label_name}
                      onChange={(e) => setFormData({ ...formData, label_name: e.target.value })}
                      required
                      className="bg-background/50 border-border"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="artwork">Artwork Upload</Label>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('artwork-upload')?.click()}
                        disabled={s3Uploading}
                        className="border-primary/20"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {artworkFile ? artworkFile.name : 'Choose Artwork'}
                      </Button>
                      {artworkFile && (
                        <span className="text-sm text-muted-foreground">
                          {(artworkFile.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                    </div>
                    <input
                      id="artwork-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleArtworkUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, or WEBP. Max 10MB. Or enter URL below.
                    </p>
                    <Input
                      id="artwork_url"
                      placeholder="Or paste artwork URL"
                      value={formData.artwork_url}
                      onChange={(e) => setFormData({ ...formData, artwork_url: e.target.value })}
                      className="bg-background/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="catalog_number">Catalog Number</Label>
                    <Input
                      id="catalog_number"
                      placeholder="Optional internal catalog ID"
                      value={formData.catalog_number}
                      onChange={(e) => setFormData({ ...formData, catalog_number: e.target.value })}
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
                <Label htmlFor="copyright_line">© Copyright Line (C-Line) *</Label>
                <Input
                  id="copyright_line"
                  placeholder="© 2025 Your Name"
                  value={formData.copyright_line}
                  onChange={(e) => setFormData({ ...formData, copyright_line: e.target.value })}
                  required
                  className="bg-background/50 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phonographic_line">℗ Phonographic Line (P-Line) *</Label>
                <Input
                  id="phonographic_line"
                  placeholder="℗ 2025 Your Label"
                  value={formData.phonographic_line}
                  onChange={(e) => setFormData({ ...formData, phonographic_line: e.target.value })}
                  required
                  className="bg-background/50 border-border"
                />
              </div>
            </div>
          </Card>

          {/* Tracks */}
          {releaseType === "album" && (
            <Card className="p-4 border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-primary">Tracks</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={autoGenerateISRCs}
                    className="border-primary/20"
                  >
                    Generate All ISRCs
                  </Button>
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
          )}

          {/* Single Track Info */}
          {releaseType === "single" && (
            <Card className="p-4 border-border">
              <h3 className="font-semibold mb-4 text-primary">Track Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="track-title">Track Title *</Label>
                  <Input
                    id="track-title"
                    placeholder="Song Name"
                    value={tracks[0]?.title || ""}
                    onChange={(e) => updateTrack(tracks[0].id, "title", e.target.value)}
                    required
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="track-duration">Duration (seconds)</Label>
                    <Input
                      id="track-duration"
                      type="number"
                      placeholder="180"
                      value={tracks[0]?.duration || ""}
                      onChange={(e) => updateTrack(tracks[0].id, "duration", e.target.value)}
                      className="bg-background/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="track-isrc">ISRC Code *</Label>
                    <Input
                      id="track-isrc"
                      placeholder="CBGNR25xxxxx"
                      value={tracks[0]?.isrc || ""}
                      onChange={(e) => updateTrack(tracks[0].id, "isrc", e.target.value)}
                      required
                      className="bg-background/50 border-border"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">Auto-generated</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="track-audio">Audio File URL</Label>
                  <Input
                    id="track-audio"
                    placeholder="https://example.com/track.mp3"
                    value={tracks[0]?.audio_file_url || ""}
                    onChange={(e) => updateTrack(tracks[0].id, "audio_file_url", e.target.value)}
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="track-featured">Featured Artists</Label>
                  <Input
                    id="track-featured"
                    placeholder="Artist 1, Artist 2"
                    value={tracks[0]?.featured_artists || ""}
                    onChange={(e) => updateTrack(tracks[0].id, "featured_artists", e.target.value)}
                    className="bg-background/50 border-border"
                  />
                </div>
              </div>
            </Card>
          )}

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
