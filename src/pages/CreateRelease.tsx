import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ArrowLeft, Sparkles } from "lucide-react";

interface Track {
  id: string;
  track_number: number;
  title: string;
  duration: string;
  isrc: string;
  audio_file: File | null;
  audio_path: string;
  featured_artists: string;
  composer: string;
  writer: string;
  contributor: string;
  publisher: string;
  publisher_ipi: string;
}

const CreateRelease = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userPlan, setUserPlan] = useState<any>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string>("");
  const [hasUPC, setHasUPC] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([{
    id: "1",
    track_number: 1,
    title: "",
    duration: "",
    isrc: "",
    audio_file: null,
    audio_path: "",
    featured_artists: "",
    composer: "",
    writer: "",
    contributor: "",
    publisher: "",
    publisher_ipi: "",
  }]);
  const [formData, setFormData] = useState({
    title: "",
    artist_name: "",
    release_date: "",
    genre: "",
    upc: "",
    copyright_line: "",
    phonographic_line: "",
    label_name: "",
    featured_artists: "",
    courtesy_line: "",
    is_multi_disc: false,
    disc_number: 1,
    volume_number: 1,
    total_discs: 1,
    total_volumes: 1,
    distributor: "",
    notes: "",
  });

  useEffect(() => {
    fetchUserPlan();
  }, []);

  const fetchUserPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_plans")
      .select(`
        *,
        plan:plans(*)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    
    setUserPlan(data);
  };

  const generateISRC = async () => {
    try {
      // Get current counter
      const { data: counter, error: fetchError } = await supabase
        .from("isrc_counter")
        .select("*")
        .single();

      if (fetchError) throw fetchError;

      // Increment counter
      const nextNumber = (counter.last_number + 1) % 100000;
      const paddedNumber = nextNumber.toString().padStart(5, '0');
      const newISRC = `${counter.prefix}${paddedNumber}`;

      // Update counter
      const { error: updateError } = await supabase
        .from("isrc_counter")
        .update({ last_number: nextNumber })
        .eq("id", counter.id);

      if (updateError) throw updateError;

      return newISRC;
    } catch (error: any) {
      toast.error("Failed to generate ISRC: " + error.message);
      return "";
    }
  };

  const handleGenerateISRC = async (trackId: string) => {
    const isrc = await generateISRC();
    if (isrc) {
      updateTrack(trackId, "isrc", isrc);
      toast.success("ISRC generated: " + isrc);
    }
  };

  const handleArtworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArtworkFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setArtworkPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTrackAudioChange = (trackId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTracks(tracks.map(t => t.id === trackId ? { ...t, audio_file: file } : t));
    }
  };

  const addTrack = () => {
    setTracks([...tracks, {
      id: Date.now().toString(),
      track_number: tracks.length + 1,
      title: "",
      duration: "",
      isrc: "",
      audio_file: null,
      audio_path: "",
      featured_artists: "",
      composer: "",
      writer: "",
      contributor: "",
      publisher: "",
      publisher_ipi: "",
    }]);
  };

  const removeTrack = (id: string) => {
    if (tracks.length > 1) {
      setTracks(tracks.filter(t => t.id !== id).map((t, idx) => ({ ...t, track_number: idx + 1 })));
    }
  };

  const updateTrack = (id: string, field: keyof Track, value: string | number | File | null) => {
    setTracks(tracks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check distributor access
      if (formData.distributor === "The Orchard") {
        if (!userPlan || userPlan.plan?.name !== "Prestige") {
          toast.error("The Orchard is only available for Prestige members");
          setLoading(false);
          return;
        }
      }

      // Upload artwork
      let artworkUrl = "";
      if (artworkFile) {
        const artworkPath = `${user.id}/${Date.now()}_${artworkFile.name}`;
        await uploadFile(artworkFile, "release-artwork", artworkPath);
        const { data: { publicUrl } } = supabase.storage
          .from("release-artwork")
          .getPublicUrl(artworkPath);
        artworkUrl = publicUrl;
      }

      // Create release
      const { data: release, error: releaseError } = await supabase
        .from("releases")
        .insert({
          user_id: user.id,
          ...formData,
          artwork_url: artworkUrl,
          featured_artists: formData.featured_artists ? formData.featured_artists.split(",").map(a => a.trim()) : [],
        })
        .select()
        .single();

      if (releaseError) throw releaseError;

      // Upload track audio files and create tracks
      for (const track of tracks) {
        let audioPath = track.audio_path;
        
        if (track.audio_file) {
          const fileName = `${user.id}/${release.id}/${Date.now()}_${track.audio_file.name}`;
          audioPath = await uploadFile(track.audio_file, "release-audio", fileName);
        }

        const { error: trackError } = await supabase
          .from("tracks")
          .insert({
            release_id: release.id,
            track_number: track.track_number,
            title: track.title,
            duration: track.duration ? parseInt(track.duration) : null,
            isrc: track.isrc,
            audio_path: audioPath,
            featured_artists: track.featured_artists ? track.featured_artists.split(",").map(a => a.trim()) : [],
            composer: track.composer || null,
            writer: track.writer || null,
            contributor: track.contributor || null,
            publisher: track.publisher || null,
            publisher_ipi: track.publisher_ipi || null,
          });

        if (trackError) throw trackError;
      }

      toast.success("Release submitted for review!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-primary opacity-5 blur-3xl" />
      
      <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CREATE NEW RELEASE
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Release Information */}
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
            <CardHeader>
              <CardTitle className="font-bold">RELEASE INFORMATION</CardTitle>
              <CardDescription>Basic details about your release</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Release Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="artist_name">Artist Name *</Label>
                  <Input
                    id="artist_name"
                    value={formData.artist_name}
                    onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="release_date">Release Date</Label>
                  <Input
                    id="release_date"
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Input
                    id="genre"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox
                      id="has_upc"
                      checked={hasUPC}
                      onCheckedChange={(checked) => setHasUPC(checked as boolean)}
                    />
                    <Label htmlFor="has_upc">I have a UPC</Label>
                  </div>
                  <Input
                    id="upc"
                    value={formData.upc}
                    onChange={(e) => setFormData({ ...formData, upc: e.target.value })}
                    disabled={!hasUPC}
                    placeholder={hasUPC ? "Enter UPC/EAN" : "Check box if you have a UPC"}
                  />
                </div>
                <div>
                  <Label htmlFor="label_name">Label Name</Label>
                  <Input
                    id="label_name"
                    value={formData.label_name}
                    onChange={(e) => setFormData({ ...formData, label_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="featured_artists">Featured Artists (comma-separated)</Label>
                <Input
                  id="featured_artists"
                  value={formData.featured_artists}
                  onChange={(e) => setFormData({ ...formData, featured_artists: e.target.value })}
                  placeholder="Artist 1, Artist 2"
                />
              </div>

              <div>
                <Label htmlFor="distributor">Distributor *</Label>
                <Select
                  value={formData.distributor}
                  onValueChange={(value) => setFormData({ ...formData, distributor: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Believe Music">Believe Music (All Plans)</SelectItem>
                    <SelectItem value="The Orchard" disabled={userPlan?.plan?.name !== "Prestige"}>
                      The Orchard (Prestige Only) {userPlan?.plan?.name !== "Prestige" && "🔒"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Artwork Upload */}
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
            <CardHeader>
              <CardTitle className="font-bold">ARTWORK</CardTitle>
              <CardDescription>Upload your release artwork (minimum 3000x3000px recommended)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="artwork"
                    accept="image/*"
                    onChange={handleArtworkChange}
                    className="hidden"
                  />
                  <label htmlFor="artwork" className="cursor-pointer">
                    {artworkPreview ? (
                      <img src={artworkPreview} alt="Artwork preview" className="max-w-xs mx-auto rounded-lg" />
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground">Click to upload artwork</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Copyright & Credits */}
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
            <CardHeader>
              <CardTitle className="font-bold">COPYRIGHT & CREDITS</CardTitle>
              <CardDescription>Legal and credit information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="copyright_line">Copyright Line (℗)</Label>
                <Input
                  id="copyright_line"
                  value={formData.copyright_line}
                  onChange={(e) => setFormData({ ...formData, copyright_line: e.target.value })}
                  placeholder="© 2024 Label Name"
                />
              </div>
              <div>
                <Label htmlFor="phonographic_line">Phonographic Line (©)</Label>
                <Input
                  id="phonographic_line"
                  value={formData.phonographic_line}
                  onChange={(e) => setFormData({ ...formData, phonographic_line: e.target.value })}
                  placeholder="℗ 2024 Label Name"
                />
              </div>
              <div>
                <Label htmlFor="courtesy_line">Courtesy Line</Label>
                <Input
                  id="courtesy_line"
                  value={formData.courtesy_line}
                  onChange={(e) => setFormData({ ...formData, courtesy_line: e.target.value })}
                  placeholder="Courtesy of..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Multi-Disc Options */}
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
            <CardHeader>
              <CardTitle className="font-bold">MULTI-DISC/VOLUME OPTIONS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_multi_disc"
                  checked={formData.is_multi_disc}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_multi_disc: checked as boolean })}
                />
                <Label htmlFor="is_multi_disc">This is a multi-disc or multi-volume release</Label>
              </div>

              {formData.is_multi_disc && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="disc_number">Disc Number</Label>
                    <Input
                      id="disc_number"
                      type="number"
                      min="1"
                      value={formData.disc_number}
                      onChange={(e) => setFormData({ ...formData, disc_number: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_discs">Total Discs</Label>
                    <Input
                      id="total_discs"
                      type="number"
                      min="1"
                      value={formData.total_discs}
                      onChange={(e) => setFormData({ ...formData, total_discs: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="volume_number">Volume Number</Label>
                    <Input
                      id="volume_number"
                      type="number"
                      min="1"
                      value={formData.volume_number}
                      onChange={(e) => setFormData({ ...formData, volume_number: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total_volumes">Total Volumes</Label>
                    <Input
                      id="total_volumes"
                      type="number"
                      min="1"
                      value={formData.total_volumes}
                      onChange={(e) => setFormData({ ...formData, total_volumes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tracks */}
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
            <CardHeader>
              <CardTitle className="font-bold">TRACKS</CardTitle>
              <CardDescription>Add all tracks for this release</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {tracks.map((track) => (
                <Card key={track.id} className="border-border/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Track {track.track_number}</h4>
                      {tracks.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTrack(track.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Track Title *</Label>
                        <Input
                          value={track.title}
                          onChange={(e) => updateTrack(track.id, "title", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Duration (seconds)</Label>
                        <Input
                          type="number"
                          value={track.duration}
                          onChange={(e) => updateTrack(track.id, "duration", e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>ISRC</Label>
                        <div className="flex gap-2">
                          <Input
                            value={track.isrc}
                            onChange={(e) => updateTrack(track.id, "isrc", e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleGenerateISRC(track.id)}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate
                          </Button>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Featured Artists (comma-separated)</Label>
                        <Input
                          value={track.featured_artists}
                          onChange={(e) => updateTrack(track.id, "featured_artists", e.target.value)}
                          placeholder="Artist 1, Artist 2"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Composer</Label>
                        <Input
                          value={track.composer}
                          onChange={(e) => updateTrack(track.id, "composer", e.target.value)}
                          placeholder="Composer name"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Writer</Label>
                        <Input
                          value={track.writer}
                          onChange={(e) => updateTrack(track.id, "writer", e.target.value)}
                          placeholder="Writer name"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Contributor</Label>
                        <Input
                          value={track.contributor}
                          onChange={(e) => updateTrack(track.id, "contributor", e.target.value)}
                          placeholder="Contributor name"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Publisher</Label>
                        <Input
                          value={track.publisher}
                          onChange={(e) => updateTrack(track.id, "publisher", e.target.value)}
                          placeholder="Publisher name"
                        />
                      </div>
                      {track.publisher && (
                        <div className="md:col-span-2">
                          <Label>Publisher IPI</Label>
                          <Input
                            value={track.publisher_ipi}
                            onChange={(e) => updateTrack(track.id, "publisher_ipi", e.target.value)}
                            placeholder="IPI number"
                          />
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <Label>Audio File or Google Drive Link</Label>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => handleTrackAudioChange(track.id, e)}
                            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                          />
                          <p className="text-xs text-muted-foreground">Or</p>
                          <Input
                            placeholder="https://drive.google.com/..."
                            value={track.audio_path}
                            onChange={(e) => updateTrack(track.id, "audio_path", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addTrack}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Track
              </Button>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
            <CardHeader>
              <CardTitle className="font-bold">ADDITIONAL NOTES</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information or special requests..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Submitting..." : "Submit Release"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateRelease;
