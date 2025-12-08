import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/toast-with-sound";
import { ArrowLeft, Upload, Plus, X, Check, Save, Music, Disc3, Album as AlbumIcon, Trash2, CreditCard, Loader2 } from "lucide-react";
import { z } from "zod";
import { useS3Upload } from "@/hooks/useS3Upload";
import { Confetti } from "@/components/Confetti";
import { usePlanPermissions } from "@/hooks/usePlanPermissions";
import { ReleasePaymentForm } from "@/components/ReleasePaymentForm";

// Pricing constants (CAD)
const TRACK_FEE = 5;
const UPC_FEE = 8;

type ReleaseType = "single" | "ep" | "album" | null;

interface TrackContributor {
  id: string;
  name: string;
  role: string;
}

interface Track {
  id: string;
  title: string;
  isrc: string;
  audioFile: File | null;
  audioUrl: string;
  contributors: TrackContributor[];
}

const CONTRIBUTOR_ROLES = [
  "Composer",
  "Producer",
  "Lyricist",
  "Songwriter",
  "Co-Writer",
  "Arranger",
  "Mixer",
  "Mastering Engineer",
  "Recording Engineer",
  "Audio Engineer",
  "Vocalist",
  "Lead Vocalist",
  "Background Vocalist",
  "Featured Artist",
  "Guitarist",
  "Bassist",
  "Drummer",
  "Pianist",
  "Keyboardist",
  "DJ",
  "Percussionist",
  "Violinist",
  "Cellist",
  "Saxophonist",
  "Trumpeter",
  "Session Musician",
  "Conductor",
  "Sound Designer",
  "Remixer",
  "Additional Producer",
  "Co-Producer",
  "Executive Producer",
  "A&R",
  "Beat Maker",
  "Programmer",
  "Vocal Producer",
  "Vocal Engineer",
  "Mix Engineer",
  "Assistant Engineer",
  "Other"
];

const releaseSchema = z.object({
  songTitle: z.string().min(1, "Song title is required").max(200),
  version: z.string().max(100).optional(),
  artistName: z.string().min(1, "Artist name is required").max(200),
  featuringArtists: z.string().max(500).optional(),
  genre: z.string().min(1, "Genre is required"),
  subGenre: z.string().optional(),
  label: z.string().max(200).optional(),
  cLine: z.string().max(200).optional(),
  cLineYear: z.string().optional(),
  pLine: z.string().max(200).optional(),
  pLineYear: z.string().optional(),
  isMusical: z.boolean(),
  isCoverSong: z.boolean(),
  previewStart: z.string().optional(),
  songLanguage: z.string().optional(),
  lyricsLanguage: z.string().optional(),
  digitalReleaseDate: z.string().min(1, "Digital release date is required"),
  originalReleaseDate: z.string().optional(),
  parentalAdvisory: z.enum(["yes", "no", "clean"]),
  requestContentId: z.boolean(),
  countryOfRecording: z.string().optional(),
  previouslyReleased: z.boolean(),
  lyrics: z.string().max(5000).optional(),
  additionalNotes: z.string().max(250).optional(),
});

interface Contributor {
  id: string;
  name: string;
  role?: string;
}

const GENRES = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Electronic", "Country", 
  "Jazz", "Classical", "Alternative", "Indie", "Metal", "Folk"
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Japanese", "Korean", "Chinese", "Arabic", "Hindi", "Other"
];

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Italy", "Spain", "Japan", "South Korea", "Other"
];

const CreateRelease = () => {
  const navigate = useNavigate();
  const { uploadFile, uploading, uploadProgress } = useS3Upload();
  const [releaseType, setReleaseType] = useState<ReleaseType>(null);
  const [tracks, setTracks] = useState<Track[]>([{ 
    id: "1", 
    title: "", 
    isrc: "", 
    audioFile: null, 
    audioUrl: "",
    contributors: []
  }]);
  const [uploadingFile, setUploadingFile] = useState<'artwork' | 'audio' | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userLabelName, setUserLabelName] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<any>(null);
  const [showPricingConfirm, setShowPricingConfirm] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    clientSecret: string;
    paymentIntentId: string;
    releaseId: string;
    publishableKey: string;
  } | null>(null);
  
  // Calculate pricing
  const trackCount = tracks.length;
  const trackTotal = TRACK_FEE * trackCount;
  const totalCost = trackTotal + UPC_FEE;
  
  // Fetch user's active label name and permissions
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("label_name, label_type, account_type")
        .eq("id", user.id)
        .single();

      const { data: planData } = await supabase
        .from("user_plans")
        .select(`
          *,
          plan:plans(*)
        `)
        .eq("user_id", user.id)
        .single();

      setProfile(profileData);
      setUserPlan(planData);

      if (profileData?.label_name && profileData?.label_type) {
        setUserLabelName(profileData.label_name);
        setFormData(prev => ({ ...prev, label: profileData.label_name }));
      }
    };

    fetchUserData();
  }, []);

  const permissions = usePlanPermissions(userPlan, profile);
  
  // Removed confetti trigger from step change - now only triggers on successful submission
  
  const currentYear = new Date().getFullYear();
  
  const getTrackLimit = () => {
    if (releaseType === "single") return 3;
    if (releaseType === "ep") return 5;
    if (releaseType === "album") return 25;
    return 1;
  };
  
  // Form data
  const [formData, setFormData] = useState({
    songTitle: "",
    version: "",
    artistName: "",
    featuringArtists: "",
    genre: "",
    subGenre: "",
    label: "",
    cLine: "",
    cLineYear: currentYear.toString(),
    pLine: "",
    pLineYear: currentYear.toString(),
    isMusical: false,
    isCoverSong: false,
    previewStart: "00:00:00",
    songLanguage: "",
    lyricsLanguage: "",
    digitalReleaseDate: "",
    originalReleaseDate: "",
    parentalAdvisory: "no" as "yes" | "no" | "clean",
    requestContentId: false,
    countryOfRecording: "",
    previouslyReleased: false,
    lyrics: "",
    additionalNotes: "",
  });

  // Files
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string>("");

  // Contributors
  const [authors, setAuthors] = useState<Contributor[]>([{ id: "1", name: "" }]);
  const [composers, setComposers] = useState<Contributor[]>([{ id: "1", name: "" }]);
  const [publishers, setPublishers] = useState<Contributor[]>([{ id: "1", name: "" }]);
  const [producers, setProducers] = useState<Contributor[]>([{ id: "1", name: "" }]);
  const [performers, setPerformers] = useState<Contributor[]>([{ id: "1", name: "", role: "" }]);
  const [additionalContributors, setAdditionalContributors] = useState<Contributor[]>([{ id: "1", name: "", role: "" }]);

  // Load saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('release-draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setFormData(draft.formData);
        setAuthors(draft.authors || [{ id: "1", name: "" }]);
        setComposers(draft.composers || [{ id: "1", name: "" }]);
        setPublishers(draft.publishers || [{ id: "1", name: "" }]);
        setProducers(draft.producers || [{ id: "1", name: "" }]);
        setPerformers(draft.performers || [{ id: "1", name: "", role: "" }]);
        setAdditionalContributors(draft.additionalContributors || [{ id: "1", name: "", role: "" }]);
        setArtworkPreview(draft.artworkPreview || "");
        setCurrentStep(draft.currentStep || 1);
        setLastSaved(new Date(draft.lastSaved));
        toast.success("Draft restored");
      } catch (error) {
        console.error("Failed to load draft:", error);
      }
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      setIsSaving(true);
      const draft = {
        formData,
        authors,
        composers,
        publishers,
        producers,
        performers,
        additionalContributors,
        artworkPreview,
        currentStep,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('release-draft', JSON.stringify(draft));
      setLastSaved(new Date());
      setIsSaving(false);
    }, 1000); // Debounce 1 second

    return () => clearTimeout(saveTimeout);
  }, [formData, authors, composers, publishers, producers, performers, additionalContributors, artworkPreview, currentStep]);

  const addContributor = (type: string) => {
    const newId = Date.now().toString();
    const newContributor = { id: newId, name: "", role: "" };
    
    switch(type) {
      case "author":
        if (authors.length < 10) setAuthors([...authors, newContributor]);
        break;
      case "composer":
        if (composers.length < 10) setComposers([...composers, newContributor]);
        break;
      case "publisher":
        if (publishers.length < 10) setPublishers([...publishers, newContributor]);
        break;
      case "producer":
        if (producers.length < 10) setProducers([...producers, newContributor]);
        break;
      case "performer":
        if (performers.length < 5) setPerformers([...performers, newContributor]);
        break;
      case "contributor":
        if (additionalContributors.length < 5) setAdditionalContributors([...additionalContributors, newContributor]);
        break;
    }
  };

  const removeContributor = (type: string, id: string) => {
    switch(type) {
      case "author":
        setAuthors(authors.filter(c => c.id !== id));
        break;
      case "composer":
        setComposers(composers.filter(c => c.id !== id));
        break;
      case "publisher":
        setPublishers(publishers.filter(c => c.id !== id));
        break;
      case "producer":
        setProducers(producers.filter(c => c.id !== id));
        break;
      case "performer":
        setPerformers(performers.filter(c => c.id !== id));
        break;
      case "contributor":
        setAdditionalContributors(additionalContributors.filter(c => c.id !== id));
        break;
    }
  };

  const updateContributor = (type: string, id: string, field: string, value: string) => {
    const updateList = (list: Contributor[]) => 
      list.map(c => c.id === id ? { ...c, [field]: value } : c);
    
    switch(type) {
      case "author":
        setAuthors(updateList(authors));
        break;
      case "composer":
        setComposers(updateList(composers));
        break;
      case "publisher":
        setPublishers(updateList(publishers));
        break;
      case "producer":
        setProducers(updateList(producers));
        break;
      case "performer":
        setPerformers(updateList(performers));
        break;
      case "contributor":
        setAdditionalContributors(updateList(additionalContributors));
        break;
    }
  };

  const handleArtworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes("jpeg") && !file.type.includes("jpg")) {
        toast.error("Only JPEG/JPG files are allowed");
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        if (img.width < 1500 || img.height < 1500) {
          toast.error("Artwork must be at least 1500x1500px");
          return;
        }
        if (img.width > 3000 || img.height > 3000) {
          toast.error("Artwork must not exceed 3000x3000px");
          return;
        }
        setArtworkFile(file);
        setArtworkPreview(URL.createObjectURL(file));
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const generateISRC = async () => {
    try {
      // Use secure database function to generate ISRC
      const { data, error } = await supabase.rpc('generate_next_isrc');

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error generating ISRC:", error);
      throw new Error("Failed to generate ISRC");
    }
  };

  const addTrack = async () => {
    if (tracks.length >= getTrackLimit()) {
      toast.error(`Maximum ${getTrackLimit()} tracks allowed for ${releaseType}`);
      return;
    }
    
    try {
      const isrc = await generateISRC();
      setTracks([...tracks, {
        id: Date.now().toString(),
        title: "",
        isrc,
        audioFile: null,
        audioUrl: "",
        contributors: []
      }]);
      toast.success(`Track added with ISRC: ${isrc}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to add track");
    }
  };

  const addTrackContributor = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track && track.contributors.length < 50) {
      updateTrack(trackId, "contributors", [
        ...track.contributors,
        { id: Date.now().toString(), name: "", role: "Composer" }
      ]);
    } else {
      toast.error("Maximum 50 contributors per track");
    }
  };

  const removeTrackContributor = (trackId: string, contributorId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      updateTrack(trackId, "contributors", track.contributors.filter(c => c.id !== contributorId));
    }
  };

  const updateTrackContributor = (trackId: string, contributorId: string, field: keyof TrackContributor, value: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      updateTrack(trackId, "contributors", track.contributors.map(c => 
        c.id === contributorId ? { ...c, [field]: value } : c
      ));
    }
  };

  const removeTrack = (id: string) => {
    if (tracks.length > 1) {
      setTracks(tracks.filter(t => t.id !== id));
    }
  };

  const updateTrack = (id: string, field: keyof Track, value: any) => {
    setTracks(tracks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleTrackAudioChange = (trackId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["audio/wav", "audio/flac", "audio/aiff", "audio/x-ms-wma"];
      if (!validTypes.includes(file.type)) {
        toast.error("Only WAV, FLAC, AIFF, or WMA (Lossless) files are allowed");
        return;
      }

      const maxSizeBytes = 30 * 1024 * 1024; // 30MB
      if (file.size > maxSizeBytes) {
        toast.error("Audio file is too large. Max size is 30MB for now.");
        return;
      }

      updateTrack(trackId, "audioFile", file);
      toast.success("Audio file selected");
    }
  };
  
  // Auto-generate ISRC for first track on release type selection
  useEffect(() => {
    if (releaseType && tracks[0] && !tracks[0].isrc) {
      generateISRC().then(isrc => {
        updateTrack(tracks[0].id, "isrc", isrc);
      }).catch(err => {
        console.error("Failed to generate initial ISRC:", err);
      });
    }
  }, [releaseType]);

  // Show pricing confirmation before proceeding
  const handleReviewSubmission = () => {
    try {
      releaseSchema.parse(formData);
      
      if (!artworkFile) {
        toast.error("Please upload artwork");
        return;
      }
      
      const missingAudio = tracks.some(t => !t.audioFile);
      if (missingAudio) {
        toast.error("Please upload audio files for all tracks");
        return;
      }

      setShowPricingConfirm(true);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    }
  };

  const handleProceedToPayment = async () => {
    setCheckoutLoading(true);
    setLoading(true);
    try {
      const validatedData = releaseSchema.parse(formData);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload artwork to S3
      setUploadingFile('artwork');
      const artworkPath = `${user.id}/release-artwork/${Date.now()}.jpg`;
      const artworkUrl = await uploadFile({ file: artworkFile!, path: artworkPath });
      setUploadingFile(null);
      if (!artworkUrl) throw new Error("Artwork upload failed");

      // Upload all track audio files
      setUploadingFile('audio');
      const uploadedTracks = await Promise.all(
        tracks.map(async (track) => {
          if (!track.audioFile) return null;
          const audioPath = `${user.id}/release-audio/${Date.now()}_${track.id}.${track.audioFile.name.split('.').pop()}`;
          const audioUrl = await uploadFile({ file: track.audioFile, path: audioPath });
          return { ...track, audioUrl };
        })
      );
      setUploadingFile(null);

      const failedUploads = uploadedTracks.filter(t => !t || !t.audioUrl);
      if (failedUploads.length > 0) throw new Error("Some audio uploads failed");

      // Create release with pending_payment status
      const { data: release, error: releaseError } = await supabase.from("releases").insert({
        user_id: user.id,
        title: validatedData.songTitle,
        artist_name: validatedData.artistName,
        genre: validatedData.genre,
        release_date: validatedData.digitalReleaseDate,
        artwork_url: artworkUrl,
        audio_file_url: uploadedTracks[0]?.audioUrl || null,
        copyright_line: validatedData.cLineYear ? `${validatedData.cLineYear} ${validatedData.cLine}` : validatedData.cLine,
        phonographic_line: validatedData.pLineYear ? `${validatedData.pLineYear} ${validatedData.pLine}` : validatedData.pLine,
        featured_artists: validatedData.featuringArtists ? validatedData.featuringArtists.split(",").map(a => a.trim()) : [],
        label_name: validatedData.label,
        notes: validatedData.additionalNotes,
        isrc: uploadedTracks[0]?.isrc || null,
        status: 'pending_payment'
      }).select().single();

      if (releaseError) throw releaseError;

      // Create track entries
      const trackData = uploadedTracks.map((track, index) => ({
        release_id: release.id,
        track_number: index + 1,
        title: track!.title || validatedData.songTitle,
        isrc: track!.isrc,
        audio_file_url: track!.audioUrl,
        composer: track!.contributors.filter(c => c.role === "Composer").map(c => c.name).join(", ") || null,
        writer: track!.contributors.filter(c => c.role === "Lyricist" || c.role === "Songwriter").map(c => c.name).join(", ") || null,
        contributor: track!.contributors.map(c => `${c.name} (${c.role})`).join(", ") || null
      }));

      await supabase.from("tracks").insert(trackData);

      // Create PaymentIntent for embedded payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          body: {
            trackCount: tracks.length,
            releaseTitle: validatedData.songTitle,
            releaseId: release.id,
          },
        }
      );

      if (paymentError) throw paymentError;

      if (paymentData?.clientSecret && paymentData?.publishableKey) {
        setPaymentData({
          clientSecret: paymentData.clientSecret,
          paymentIntentId: paymentData.paymentIntentId,
          releaseId: release.id,
          publishableKey: paymentData.publishableKey,
        });
        setShowPricingConfirm(false);
        setShowPaymentForm(true);
      } else {
        throw new Error("Failed to initialize payment");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || 'Failed to submit release');
      }
    } finally {
      setUploadingFile(null);
      setLoading(false);
      setCheckoutLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowConfetti(true);
    toast.success("Release submitted successfully!");
    localStorage.removeItem('release-draft');
    setShowPaymentForm(false);
    setPaymentData(null);
    setTimeout(() => {
      navigate("/dashboard?release_submitted=true");
    }, 2000);
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setPaymentData(null);
    toast.info("Payment cancelled. Your release is saved as draft.");
  };

  const [showPayLaterConfirm, setShowPayLaterConfirm] = useState(false);

  const handlePayLater = async () => {
    setShowPayLaterConfirm(false);
    setShowPricingConfirm(false);
    
    // Send admin notification about pay later selection
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.functions.invoke('send-system-notification', {
          body: {
            type: 'pay_later_selected',
            userEmail: user.email,
            releaseTitle: formData.songTitle,
            artistName: formData.artistName,
            trackCount: tracks.length,
            totalAmount: totalCost,
          }
        });
      }
    } catch (error) {
      console.error('Failed to send admin notification:', error);
    }
    
    toast.info("Your release has been saved. You will receive a payment link within 3 business days.");
    localStorage.removeItem('release-draft');
    navigate("/dashboard");
  };

  const steps = [
    { number: 1, title: "Submission Details" },
    { number: 2, title: "Upload Artwork" },
    { number: 3, title: "Upload Audio File" },
    { number: 4, title: "Metadata Details" },
    { number: 5, title: "Contributors" },
    { number: 6, title: "Additional Notes" }
  ];

  // Selection screen
  if (!releaseType) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold">Create New Release</h1>
            </div>
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Card className="w-full max-w-4xl border-primary/20 animate-fade-in">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold mb-2">Create Submission</CardTitle>
              <CardDescription className="text-lg">Create a new submission</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
                <button
                  onClick={() => setReleaseType("single")}
                  className="group relative overflow-hidden rounded-lg border-2 border-border hover:border-primary/50 transition-all duration-300 bg-background/50 hover:bg-background p-8 flex flex-col items-center justify-center gap-4 min-h-[280px] animate-fade-in"
                  style={{ animationDelay: "0.1s" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Music className="w-20 h-20 text-primary group-hover:scale-110 transition-transform relative z-10" />
                  <div className="text-center relative z-10">
                    <h3 className="text-2xl font-bold mb-2">Create Single</h3>
                    <p className="text-muted-foreground">Create a single submission</p>
                    <p className="text-sm text-muted-foreground mt-2">Max 3 tracks</p>
                  </div>
                </button>

                <button
                  onClick={() => setReleaseType("ep")}
                  className="group relative overflow-hidden rounded-lg border-2 border-border hover:border-primary/50 transition-all duration-300 bg-background/50 hover:bg-background p-8 flex flex-col items-center justify-center gap-4 min-h-[280px] animate-fade-in"
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Disc3 className="w-20 h-20 text-primary group-hover:scale-110 transition-transform relative z-10" />
                  <div className="text-center relative z-10">
                    <h3 className="text-2xl font-bold mb-2">Create EP</h3>
                    <p className="text-muted-foreground">Create an EP submission</p>
                    <p className="text-sm text-muted-foreground mt-2">Max 5 tracks</p>
                  </div>
                </button>

                <button
                  onClick={() => setReleaseType("album")}
                  className="group relative overflow-hidden rounded-lg border-2 border-border hover:border-primary/50 transition-all duration-300 bg-background/50 hover:bg-background p-8 flex flex-col items-center justify-center gap-4 min-h-[280px] animate-fade-in"
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <AlbumIcon className="w-20 h-20 text-primary group-hover:scale-110 transition-transform relative z-10" />
                  <div className="text-center relative z-10">
                    <h3 className="text-2xl font-bold mb-2">Create Album</h3>
                    <p className="text-muted-foreground">Create an album submission</p>
                    <p className="text-sm text-muted-foreground mt-2">Max 25 tracks</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Submit New {releaseType.charAt(0).toUpperCase() + releaseType.slice(1)}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Save className="w-4 h-4 animate-pulse" />
                <span>Saving...</span>
              </div>
            )}
            {!isSaving && lastSaved && !uploadingFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-green-500" />
                <span>Draft saved</span>
              </div>
            )}
            {uploadingFile && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">
                    Uploading {uploadingFile}... {uploadProgress}%
                  </span>
                  <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="container mx-auto px-4 py-6">
        {/* Animated Progress Bar */}
        <div className="mb-6">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-500 ease-out"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Step {currentStep} of {steps.length}</span>
            <span>{Math.round(((currentStep - 1) / (steps.length - 1)) * 100)}% Complete</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  currentStep === step.number 
                    ? "bg-primary text-primary-foreground" 
                    : currentStep > step.number
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                </div>
                <span className="text-xs mt-2 text-center hidden md:block">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${
                  currentStep > step.number ? "bg-green-500" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Submission Details */}
        {currentStep === 1 && (
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20 animate-fade-in">
            <CardHeader>
              <CardTitle>Add your submission details</CardTitle>
              <CardDescription>Basic information about your release</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="songTitle">Song Title *</Label>
                  <Input
                    id="songTitle"
                    value={formData.songTitle}
                    onChange={(e) => setFormData({ ...formData, songTitle: e.target.value })}
                    placeholder="Enter song title"
                  />
                </div>
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="Enter version"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="artistName">Artist Name (Main Artist) *</Label>
                  <Input
                    id="artistName"
                    value={formData.artistName}
                    onChange={(e) => setFormData({ ...formData, artistName: e.target.value })}
                    placeholder="Main Artist"
                  />
                </div>
                <div>
                  <Label htmlFor="featuringArtists">Featuring Artist(s)</Label>
                  <Input
                    id="featuringArtists"
                    value={formData.featuringArtists}
                    onChange={(e) => setFormData({ ...formData, featuringArtists: e.target.value })}
                    placeholder="Separate multiple artists with commas"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="genre">Genre *</Label>
                  <Select value={formData.genre} onValueChange={(value) => setFormData({ ...formData, genre: value })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select genre..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {GENRES.map((genre) => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subGenre">Sub-genre</Label>
                  <Input
                    id="subGenre"
                    value={formData.subGenre}
                    onChange={(e) => setFormData({ ...formData, subGenre: e.target.value })}
                    placeholder="Please select a genre first"
                    disabled={!formData.genre}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Label name"
                  disabled={permissions.canCreateLabels}
                  className={permissions.canCreateLabels ? "bg-muted" : "bg-background"}
                />
                {permissions.canCreateLabels && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Label is locked to your active label
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="cLine">C-Line (©)</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.cLineYear} 
                      onValueChange={(value) => setFormData({ ...formData, cLineYear: value })}
                    >
                      <SelectTrigger className="bg-background w-[120px]">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {Array.from({ length: currentYear - 1949 }, (_, i) => currentYear + 1 - i).map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="cLine"
                      value={formData.cLine}
                      onChange={(e) => setFormData({ ...formData, cLine: e.target.value })}
                      placeholder="C-Line information"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="pLine">P-Line (℗)</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.pLineYear} 
                      onValueChange={(value) => setFormData({ ...formData, pLineYear: value })}
                    >
                      <SelectTrigger className="bg-background w-[120px]">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {Array.from({ length: currentYear - 1949 }, (_, i) => currentYear + 1 - i).map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="pLine"
                      value={formData.pLine}
                      onChange={(e) => setFormData({ ...formData, pLine: e.target.value })}
                      placeholder="P-Line information"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Is it a Musical / Instrumental?</Label>
                <RadioGroup 
                  value={formData.isMusical ? "yes" : "no"}
                  onValueChange={(value) => setFormData({ ...formData, isMusical: value === "yes" })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="musical-yes" />
                    <Label htmlFor="musical-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="musical-no" />
                    <Label htmlFor="musical-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Is it a Cover Song?</Label>
                <RadioGroup 
                  value={formData.isCoverSong ? "yes" : "no"}
                  onValueChange={(value) => setFormData({ ...formData, isCoverSong: value === "yes" })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="cover-yes" />
                    <Label htmlFor="cover-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="cover-no" />
                    <Label htmlFor="cover-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload Artwork */}
        {currentStep === 2 && (
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20 animate-fade-in">
            <CardHeader>
              <CardTitle>Upload Artwork</CardTitle>
              <CardDescription>Upload your release artwork</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="artwork"
                  accept="image/jpeg,image/jpg"
                  onChange={handleArtworkChange}
                  className="hidden"
                />
                <label htmlFor="artwork" className="cursor-pointer">
                  {artworkPreview ? (
                    <img src={artworkPreview} alt="Artwork preview" className="max-w-xs mx-auto rounded-lg" />
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Select a image or drag here to upload directly</p>
                      <p className="text-xs text-muted-foreground">JPEG or JPG only</p>
                      <p className="text-xs text-muted-foreground">Min 1500x1500 Max 3000x3000</p>
                    </div>
                  )}
                </label>
              </div>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>• The cover must not contain internet addresses, email addresses, barcodes, pricing details, references to physical or digital formats, time-sensitive information, misleading content, or any material deemed offensive or explicit.</p>
                <p>• The cover must include the artist's name and the title of the release.</p>
                <p>• Please don't include any contact information (e.g: phone numbers) inside the artwork</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Upload Audio Files & Track Management */}
        {currentStep === 3 && (
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20 animate-fade-in">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Upload Audio Files & Tracks</CardTitle>
                  <CardDescription>Upload your audio files and manage tracks ({tracks.length}/{getTrackLimit()} tracks)</CardDescription>
                </div>
                {tracks.length < getTrackLimit() && (
                  <Button onClick={addTrack} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Track
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {tracks.map((track, index) => (
                <Card key={track.id} className="p-4 border-border/50">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Music className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Track {index + 1}</h3>
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
                    
                    <div className="space-y-2">
                      <Label htmlFor={`track-title-${track.id}`}>Track Title</Label>
                      <Input
                        id={`track-title-${track.id}`}
                        value={track.title}
                        onChange={(e) => updateTrack(track.id, "title", e.target.value)}
                        placeholder="Track Name"
                        className="bg-background/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`track-isrc-${track.id}`}>ISRC Code</Label>
                      <Input
                        id={`track-isrc-${track.id}`}
                        value={track.isrc}
                        disabled
                        className="bg-background/50"
                      />
                      <p className="text-xs text-muted-foreground">Auto-generated</p>
                    </div>

                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        id={`audio-${track.id}`}
                        accept="audio/wav,audio/flac,audio/aiff,audio/x-ms-wma"
                        onChange={(e) => handleTrackAudioChange(track.id, e)}
                        className="hidden"
                      />
                      <label htmlFor={`audio-${track.id}`} className="cursor-pointer">
                        <div className="space-y-2">
                          <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {track.audioFile ? track.audioFile.name : "Select an audio file or drag here to upload"}
                          </p>
                          <p className="text-xs text-muted-foreground">WAV (PCM), FLAC, AIFF, WMA (Lossless) only</p>
                        </div>
                      </label>
                    </div>

                    {/* Track Contributors */}
                    <div className="space-y-3 pt-4 border-t border-border">
                      <div className="flex justify-between items-center">
                        <Label>Track Contributors ({track.contributors.length}/50)</Label>
                        {track.contributors.length < 50 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addTrackContributor(track.id)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Contributor
                          </Button>
                        )}
                      </div>
                      
                      {track.contributors.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No contributors added yet. Click "Add Contributor" to add composers, producers, etc.
                        </p>
                      )}

                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {track.contributors.map((contributor) => (
                          <div key={contributor.id} className="flex gap-2 items-start p-3 rounded-lg bg-background/50 border border-border">
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label htmlFor={`contributor-name-${contributor.id}`} className="text-xs">Name</Label>
                                  <Input
                                    id={`contributor-name-${contributor.id}`}
                                    value={contributor.name}
                                    onChange={(e) => updateTrackContributor(track.id, contributor.id, "name", e.target.value)}
                                    placeholder="Contributor Name"
                                    className="bg-background h-9 text-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`contributor-role-${contributor.id}`} className="text-xs">Role</Label>
                                  <Select
                                    value={contributor.role}
                                    onValueChange={(value) => updateTrackContributor(track.id, contributor.id, "role", value)}
                                  >
                                    <SelectTrigger className="bg-background h-9 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                      {CONTRIBUTOR_ROLES.map((role) => (
                                        <SelectItem key={role} value={role} className="text-sm">
                                          {role}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTrackContributor(track.id, contributor.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 p-0 mt-5"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Metadata Details */}
        {currentStep === 4 && (
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20 animate-fade-in">
            <CardHeader>
              <CardTitle>Metadata Details</CardTitle>
              <CardDescription>Additional release information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="previewStart">Preview Start</Label>
                <Input
                  id="previewStart"
                  type="time"
                  step="1"
                  value={formData.previewStart}
                  onChange={(e) => setFormData({ ...formData, previewStart: e.target.value })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="songLanguage">Song Language</Label>
                  <Select value={formData.songLanguage} onValueChange={(value) => setFormData({ ...formData, songLanguage: value })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select language..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="lyricsLanguage">Lyrics Language</Label>
                  <Select value={formData.lyricsLanguage} onValueChange={(value) => setFormData({ ...formData, lyricsLanguage: value })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select language..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="digitalReleaseDate">Digital Release Date *</Label>
                  <Input
                    id="digitalReleaseDate"
                    type="date"
                    value={formData.digitalReleaseDate}
                    onChange={(e) => setFormData({ ...formData, digitalReleaseDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="originalReleaseDate">Original Release Date</Label>
                  <Input
                    id="originalReleaseDate"
                    type="date"
                    value={formData.originalReleaseDate}
                    onChange={(e) => setFormData({ ...formData, originalReleaseDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                The distribution of your release may be delayed if it contains text, audio, or cover elements that infringe store guidelines. To avoid this, we strongly recommend submitting your content at least 7 days prior to the release date.
              </div>

              <div className="space-y-3">
                <Label>Parental Advisory</Label>
                <RadioGroup 
                  value={formData.parentalAdvisory}
                  onValueChange={(value: "yes" | "no" | "clean") => setFormData({ ...formData, parentalAdvisory: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="pa-yes" />
                    <Label htmlFor="pa-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="pa-no" />
                    <Label htmlFor="pa-no">No</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="clean" id="pa-clean" />
                    <Label htmlFor="pa-clean">Clean</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Request Content ID</Label>
                <RadioGroup 
                  value={formData.requestContentId ? "yes" : "no"}
                  onValueChange={(value) => setFormData({ ...formData, requestContentId: value === "yes" })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="cid-yes" />
                    <Label htmlFor="cid-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="cid-no" />
                    <Label htmlFor="cid-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="countryOfRecording">Country of Recording</Label>
                <Select value={formData.countryOfRecording} onValueChange={(value) => setFormData({ ...formData, countryOfRecording: value })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select country..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Is this song previously released?</Label>
                <RadioGroup 
                  value={formData.previouslyReleased ? "yes" : "no"}
                  onValueChange={(value) => setFormData({ ...formData, previouslyReleased: value === "yes" })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="prev-yes" />
                    <Label htmlFor="prev-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="prev-no" />
                    <Label htmlFor="prev-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Contributors */}
        {currentStep === 5 && (
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20 animate-fade-in">
            <CardHeader>
              <CardTitle>Contributors</CardTitle>
              <CardDescription>Add all contributors to this release</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Authors */}
              <div>
                <Label>Author(s)</Label>
                {authors.map((author, index) => (
                  <div key={author.id} className="flex gap-2 mt-2">
                    <Input
                      value={author.name}
                      onChange={(e) => updateContributor("author", author.id, "name", e.target.value)}
                      placeholder={`Enter Author ${index + 1}`}
                    />
                    {authors.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeContributor("author", author.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addContributor("author")}
                  disabled={authors.length >= 10}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Author ({authors.length}/10)
                </Button>
              </div>

              {/* Composers */}
              <div>
                <Label>Composer(s)</Label>
                {composers.map((composer, index) => (
                  <div key={composer.id} className="flex gap-2 mt-2">
                    <Input
                      value={composer.name}
                      onChange={(e) => updateContributor("composer", composer.id, "name", e.target.value)}
                      placeholder={`Enter Composer ${index + 1}`}
                    />
                    {composers.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeContributor("composer", composer.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addContributor("composer")}
                  disabled={composers.length >= 10}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Composer ({composers.length}/10)
                </Button>
              </div>

              {/* Publishers */}
              <div>
                <Label>Publisher(s)</Label>
                {publishers.map((publisher, index) => (
                  <div key={publisher.id} className="flex gap-2 mt-2">
                    <Input
                      value={publisher.name}
                      onChange={(e) => updateContributor("publisher", publisher.id, "name", e.target.value)}
                      placeholder={`Enter Publisher ${index + 1}`}
                    />
                    {publishers.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeContributor("publisher", publisher.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addContributor("publisher")}
                  disabled={publishers.length >= 10}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Publisher ({publishers.length}/10)
                </Button>
              </div>

              {/* Producers */}
              <div>
                <Label>Producer(s)</Label>
                {producers.map((producer, index) => (
                  <div key={producer.id} className="flex gap-2 mt-2">
                    <Input
                      value={producer.name}
                      onChange={(e) => updateContributor("producer", producer.id, "name", e.target.value)}
                      placeholder={`Enter Producer ${index + 1}`}
                    />
                    {producers.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeContributor("producer", producer.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addContributor("producer")}
                  disabled={producers.length >= 10}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Producer ({producers.length}/10)
                </Button>
              </div>

              {/* Additional Performers */}
              <div>
                <Label>Additional Performer(s)</Label>
                {performers.map((performer, index) => (
                  <div key={performer.id} className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                      value={performer.name}
                      onChange={(e) => updateContributor("performer", performer.id, "name", e.target.value)}
                      placeholder={`Enter Performer ${index + 1}`}
                    />
                    <div className="flex gap-2">
                      <Input
                        value={performer.role}
                        onChange={(e) => updateContributor("performer", performer.id, "role", e.target.value)}
                        placeholder="Role"
                      />
                      {performers.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeContributor("performer", performer.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addContributor("performer")}
                  disabled={performers.length >= 5}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Performer ({performers.length}/5)
                </Button>
              </div>

              {/* Additional Contributors */}
              <div>
                <Label>Additional Contributor(s)</Label>
                {additionalContributors.map((contributor, index) => (
                  <div key={contributor.id} className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                      value={contributor.name}
                      onChange={(e) => updateContributor("contributor", contributor.id, "name", e.target.value)}
                      placeholder={`Enter Contributor ${index + 1}`}
                    />
                    <div className="flex gap-2">
                      <Input
                        value={contributor.role}
                        onChange={(e) => updateContributor("contributor", contributor.id, "role", e.target.value)}
                        placeholder="Role"
                      />
                      {additionalContributors.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeContributor("contributor", contributor.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addContributor("contributor")}
                  disabled={additionalContributors.length >= 5}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contributor ({additionalContributors.length}/5)
                </Button>
              </div>

              {/* Lyrics */}
              <div>
                <Label htmlFor="lyrics">Lyrics (Optional)</Label>
                <Textarea
                  id="lyrics"
                  value={formData.lyrics}
                  onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                  placeholder="Enter lyrics"
                  className="min-h-[150px]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Additional Notes */}
        {currentStep === 6 && (
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20 animate-fade-in">
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>
                If you have any messages for administrators or additional information to share, please feel free to include them here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                placeholder="Enter Additional Notes"
                maxLength={250}
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {formData.additionalNotes.length}/250
              </p>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          {currentStep < 6 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Next
            </Button>
          ) : (
            <Button onClick={handleReviewSubmission} disabled={loading || uploading}>
              Review & Pay (${totalCost.toFixed(2)} CAD)
            </Button>
          )}
        </div>
      </div>

      {/* Pricing Confirmation Dialog */}
      <Dialog open={showPricingConfirm} onOpenChange={setShowPricingConfirm}>
        <DialogContent className="sm:max-w-[450px] bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Confirm Submission
            </DialogTitle>
            <DialogDescription>
              Review your release fees before proceeding to payment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="font-semibold mb-2">{formData.songTitle || "Untitled Release"}</h4>
              <p className="text-sm text-muted-foreground">{formData.artistName}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">
                  Track Fee ({trackCount} track{trackCount > 1 ? 's' : ''} × $5 CAD)
                </span>
                <span className="font-medium">${trackTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">UPC Fee</span>
                <span className="font-medium">${UPC_FEE.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">${totalCost.toFixed(2)} CAD</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPricingConfirm(false)}
                disabled={checkoutLoading}
              >
                Cancel
              </Button>
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
            </div>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShowPayLaterConfirm(true)}
              disabled={checkoutLoading}
            >
              Pay Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Form Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-[500px]">
          {paymentData && (
            <ReleasePaymentForm
              clientSecret={paymentData.clientSecret}
              releaseId={paymentData.releaseId}
              paymentIntentId={paymentData.paymentIntentId}
              trackCount={trackCount}
              releaseTitle={formData.songTitle}
              publishableKey={paymentData.publishableKey}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Pay Later Confirmation Dialog */}
      <Dialog open={showPayLaterConfirm} onOpenChange={setShowPayLaterConfirm}>
        <DialogContent className="sm:max-w-[450px] bg-card border-destructive/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">
              Pay Later Warning
            </DialogTitle>
            <DialogDescription className="text-foreground">
              Are you sure you want to pay later?
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
            <p className="text-foreground">
              You will be given a link to pay for this release within <strong>3 business days</strong>.
            </p>
            <p className="mt-2 text-destructive font-medium">
              Failure to pay will result in your release not being submitted or account termination.
            </p>
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPayLaterConfirm(false)}
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handlePayLater}
            >
              Confirm Pay Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateRelease;
