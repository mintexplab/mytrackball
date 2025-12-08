import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "@/lib/toast-with-sound";
import { Plus, Trash2, Music, Upload, Loader2, CreditCard } from "lucide-react";
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

// Pricing constants (CAD)
const TRACK_FEE = 5;
const UPC_FEE = 8;

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

interface TrackAllowanceData {
  hasSubscription: boolean;
  tracksAllowed: number;
  tracksUsed: number;
  tracksRemaining: number;
  monthlyAmount: number;
}

const EnhancedCreateRelease = ({ children }: EnhancedCreateReleaseProps) => {
  const [showSelection, setShowSelection] = useState(false);
  const [open, setOpen] = useState(false);
  const [showPricingConfirm, setShowPricingConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [releaseType, setReleaseType] = useState<"single" | "album">("single");
  const { uploadFile, uploading: s3Uploading } = useS3Upload();
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [pendingReleaseId, setPendingReleaseId] = useState<string | null>(null);
  const [trackAllowance, setTrackAllowance] = useState<TrackAllowanceData | null>(null);
  const [useAllowance, setUseAllowance] = useState<boolean | null>(null);
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

  // Calculate pricing
  const trackCount = tracks.length;
  const trackTotal = TRACK_FEE * trackCount;
  const totalCost = trackTotal + UPC_FEE;

  // Check if user can use allowance for this release
  const canUseAllowance = trackAllowance?.hasSubscription && trackAllowance.tracksRemaining >= trackCount;

  // Fetch track allowance on mount
  useEffect(() => {
    const fetchTrackAllowance = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-track-allowance');
        if (error) throw error;
        setTrackAllowance(data);
      } catch (err) {
        console.error("Error fetching track allowance:", err);
      }
    };
    fetchTrackAllowance();
  }, []);

  const generateISRC = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_next_isrc');
      if (error) throw error;
      return data;
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
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG, or WEBP)');
      return;
    }
    
    if (file.size > 10485760) {
      toast.error('Artwork file must be less than 10MB');
      return;
    }
    
    setArtworkFile(file);
    toast.success('Artwork ready to upload');
  };

  const handleReviewSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate release data
      releaseSchema.parse(formData);

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

      // Show pricing confirmation
      setShowPricingConfirm(true);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleProceedToPayment = async () => {
    setCheckoutLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload artwork to S3 if file is selected
      let artworkUrl = formData.artwork_url || null;
      if (artworkFile) {
        const timestamp = Date.now();
        const fileExt = artworkFile.name.split('.').pop();
        const s3Path = `${user.id}/release-artwork/${timestamp}.${fileExt}`;
        
        const uploadedUrl = await uploadFile({ file: artworkFile, path: s3Path });
        if (uploadedUrl) {
          artworkUrl = uploadedUrl;
        } else {
          throw new Error('Failed to upload artwork');
        }
      }

      // Create release as pending payment
      const { data: release, error: releaseError } = await supabase
        .from("releases")
        .insert({
          user_id: user.id,
          title: formData.title,
          artist_name: formData.artist_name,
          release_date: formData.release_date || null,
          genre: formData.genre || null,
          label_name: formData.label_name,
          artwork_url: artworkUrl,
          copyright_line: formData.copyright_line,
          phonographic_line: formData.phonographic_line,
          featured_artists: formData.featured_artists ? formData.featured_artists.split(",").map(a => a.trim()) : [],
          notes: formData.notes || null,
          catalog_number: formData.catalog_number || null,
          isrc: tracks[0]?.isrc || null,
          status: 'pending_payment',
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

      setPendingReleaseId(release.id);

      // Create Stripe checkout session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-release-checkout',
        {
          body: {
            trackCount: tracks.length,
            releaseTitle: formData.title,
            releaseId: release.id,
          },
        }
      );

      if (checkoutError) throw checkoutError;

      if (checkoutData?.url) {
        window.open(checkoutData.url, '_blank');
        toast.success("Redirecting to payment...");
        setShowPricingConfirm(false);
        setOpen(false);
        resetForm();
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to create checkout session");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSelectionClick = (type: "single" | "album") => {
    setReleaseType(type);
    setShowSelection(false);
    setOpen(true);
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
    setShowPricingConfirm(false);
    setPendingReleaseId(null);
    setUseAllowance(null);
  };

  const handleUseTrackAllowance = async () => {
    setCheckoutLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload artwork to S3 if file is selected
      let artworkUrl = formData.artwork_url || null;
      if (artworkFile) {
        const timestamp = Date.now();
        const fileExt = artworkFile.name.split('.').pop();
        const s3Path = `${user.id}/release-artwork/${timestamp}.${fileExt}`;
        
        const uploadedUrl = await uploadFile({ file: artworkFile, path: s3Path });
        if (uploadedUrl) {
          artworkUrl = uploadedUrl;
        } else {
          throw new Error('Failed to upload artwork');
        }
      }

      // Create release as pending (covered by allowance)
      const { data: release, error: releaseError } = await supabase
        .from("releases")
        .insert({
          user_id: user.id,
          title: formData.title,
          artist_name: formData.artist_name,
          release_date: formData.release_date || null,
          genre: formData.genre || null,
          label_name: formData.label_name,
          artwork_url: artworkUrl,
          copyright_line: formData.copyright_line,
          phonographic_line: formData.phonographic_line,
          featured_artists: formData.featured_artists ? formData.featured_artists.split(",").map(a => a.trim()) : [],
          notes: formData.notes || null,
          catalog_number: formData.catalog_number || null,
          isrc: tracks[0]?.isrc || null,
          status: 'pending',
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

      // Update track allowance usage
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const { data: usageData } = await supabase
        .from("track_allowance_usage")
        .select("track_count")
        .eq("user_id", user.id)
        .eq("month_year", monthYear)
        .single();

      const currentUsage = usageData?.track_count || 0;
      
      await supabase
        .from("track_allowance_usage")
        .upsert({
          user_id: user.id,
          month_year: monthYear,
          track_count: currentUsage + tracks.length,
          tracks_allowed: trackAllowance?.tracksAllowed || 0
        }, {
          onConflict: "user_id,month_year"
        });

      toast.success("Release submitted using your Track Allowance!");
      setShowPricingConfirm(false);
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(error.message || "Failed to submit release");
    } finally {
      setCheckoutLoading(false);
    }
  };

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
    <>
      {/* Selection Menu Dialog */}
      <Dialog open={showSelection} onOpenChange={setShowSelection}>
        <DialogTrigger asChild onClick={() => setShowSelection(true)}>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center">Create Submission</DialogTitle>
            <DialogDescription className="text-center text-lg">
              Create a new submission
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-8">
            <button
              onClick={() => handleSelectionClick("single")}
              className="group relative overflow-hidden rounded-lg border-2 border-border hover:border-primary/50 transition-all duration-300 bg-background/50 hover:bg-background p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Music className="w-20 h-20 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-center relative z-10">
                <h3 className="text-2xl font-bold mb-2">Create Single</h3>
                <p className="text-muted-foreground">Create a single submission</p>
              </div>
            </button>

            <button
              onClick={() => handleSelectionClick("album")}
              className="group relative overflow-hidden rounded-lg border-2 border-border hover:border-primary/50 transition-all duration-300 bg-background/50 hover:bg-background p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Music className="w-20 h-20 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-center relative z-10">
                <h3 className="text-2xl font-bold mb-2">Create Album</h3>
                <p className="text-muted-foreground">Create an album submission</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Confirmation Dialog */}
      <Dialog open={showPricingConfirm} onOpenChange={(open) => {
        setShowPricingConfirm(open);
        if (!open) setUseAllowance(null);
      }}>
        <DialogContent className="sm:max-w-[500px] bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Confirm Submission
            </DialogTitle>
            <DialogDescription>
              {canUseAllowance 
                ? "You have a Track Allowance plan! Choose how to submit this release."
                : "Review your release fees before proceeding to payment"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="font-semibold mb-2">{formData.title}</h4>
              <p className="text-sm text-muted-foreground">{formData.artist_name}</p>
            </div>

            {/* Track Allowance Option */}
            {canUseAllowance && useAllowance === null && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm font-medium mb-3">
                  This release will use {trackCount}/{trackAllowance?.tracksRemaining} of your remaining track allowance!
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Would you like to use your Track Allowance plan for this release, or pay upfront?
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setUseAllowance(true)}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    Use Track Allowance
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setUseAllowance(false)}
                    className="flex-1"
                  >
                    Pay Upfront
                  </Button>
                </div>
              </div>
            )}

            {/* Show pricing breakdown if no allowance or user chose to pay */}
            {(!canUseAllowance || useAllowance === false) && (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">
                      Track Fee ({trackCount} track{trackCount > 1 ? 's' : ''} × $5 CAD)
                    </span>
                    <span className="font-semibold">${trackTotal.toFixed(2)} CAD</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">UPC Fee</span>
                    <span className="font-semibold">${UPC_FEE.toFixed(2)} CAD</span>
                  </div>
                  <div className="flex justify-between items-center py-3 text-lg">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-primary">${totalCost.toFixed(2)} CAD</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  You will be redirected to our secure payment portal to complete your transaction.
                </p>
              </>
            )}

            {/* Confirmation when using allowance */}
            {useAllowance === true && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-400 font-medium mb-2">
                  ✓ Using Track Allowance
                </p>
                <p className="text-sm text-muted-foreground">
                  This release will be submitted using your track allowance. 
                  After submission, you'll have {(trackAllowance?.tracksRemaining || 0) - trackCount} tracks remaining this month.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (useAllowance !== null && canUseAllowance) {
                  setUseAllowance(null);
                } else {
                  setShowPricingConfirm(false);
                }
              }}
              className="flex-1"
              disabled={checkoutLoading}
            >
              Back
            </Button>
            
            {/* Show appropriate action button */}
            {useAllowance === true ? (
              <Button
                onClick={handleUseTrackAllowance}
                disabled={checkoutLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit with Allowance"
                )}
              </Button>
            ) : (!canUseAllowance || useAllowance === false) ? (
              <Button
                onClick={handleProceedToPayment}
                disabled={checkoutLoading}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay ${totalCost.toFixed(2)} CAD
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Release Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild className="hidden">
          <button />
        </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Release</DialogTitle>
          <DialogDescription>
            Submit your music for distribution with complete metadata
          </DialogDescription>
        </DialogHeader>

        {/* Pricing Preview */}
        <Card className="p-4 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Estimated Cost</h4>
              <p className="text-xs text-muted-foreground">
                {trackCount} track{trackCount > 1 ? 's' : ''} × $5 + $8 UPC
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">${totalCost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">CAD</p>
            </div>
          </div>
        </Card>

        <form onSubmit={handleReviewSubmission} className="space-y-6">
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
                    Add Track (+$5)
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
              Review & Pay (${totalCost.toFixed(2)} CAD)
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default EnhancedCreateRelease;
