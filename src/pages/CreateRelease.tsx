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
import { toast } from "sonner";
import { ArrowLeft, Upload, Plus, X, Check, Save } from "lucide-react";
import { z } from "zod";
import { useS3Upload } from "@/hooks/useS3Upload";

const releaseSchema = z.object({
  songTitle: z.string().min(1, "Song title is required").max(200),
  version: z.string().max(100).optional(),
  artistName: z.string().min(1, "Artist name is required").max(200),
  featuringArtists: z.string().max(500).optional(),
  genre: z.string().min(1, "Genre is required"),
  subGenre: z.string().optional(),
  label: z.string().max(200).optional(),
  cLine: z.string().max(200).optional(),
  pLine: z.string().max(200).optional(),
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
  const [uploadingFile, setUploadingFile] = useState<'artwork' | 'audio' | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
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
    pLine: "",
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
  const [audioFile, setAudioFile] = useState<File | null>(null);

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

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["audio/wav", "audio/flac", "audio/aiff", "audio/x-ms-wma"];
      if (!validTypes.includes(file.type)) {
        toast.error("Only WAV, FLAC, AIFF, or WMA (Lossless) files are allowed");
        return;
      }
      setAudioFile(file);
      toast.success("Audio file selected");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const validatedData = releaseSchema.parse(formData);
      
      if (!artworkFile) {
        toast.error("Please upload artwork");
        setLoading(false);
        return;
      }
      
      if (!audioFile) {
        toast.error("Please upload audio file");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload artwork
      setUploadingFile('artwork');
      const artworkPath = `release-artwork/${user.id}/${Date.now()}.jpg`;
      const artworkUrl = await uploadFile({ file: artworkFile, path: artworkPath });
      setUploadingFile(null);

      // Upload audio
      setUploadingFile('audio');
      const audioPath = `release-audio/${user.id}/${Date.now()}.${audioFile.name.split('.').pop()}`;
      const audioUrl = await uploadFile({ file: audioFile, path: audioPath });
      setUploadingFile(null);

      // Create release
      const { error: releaseError } = await supabase.from("releases").insert({
        user_id: user.id,
        title: validatedData.songTitle,
        artist_name: validatedData.artistName,
        genre: validatedData.genre,
        release_date: validatedData.digitalReleaseDate,
        artwork_url: artworkUrl,
        audio_file_url: audioUrl,
        copyright_line: validatedData.cLine,
        phonographic_line: validatedData.pLine,
        featured_artists: validatedData.featuringArtists ? validatedData.featuringArtists.split(",").map(a => a.trim()) : [],
        label_name: validatedData.label,
        notes: validatedData.additionalNotes,
        status: 'pending'
      });

      if (releaseError) throw releaseError;

      // Clear draft after successful submission
      localStorage.removeItem('release-draft');
      
      toast.success("Release submitted successfully!");
      navigate("/dashboard");
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

  const steps = [
    { number: 1, title: "Submission Details" },
    { number: 2, title: "Upload Artwork" },
    { number: 3, title: "Upload Audio File" },
    { number: 4, title: "Metadata Details" },
    { number: 5, title: "Contributors" },
    { number: 6, title: "Additional Notes" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Submit New Release</h1>
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
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
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
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cLine">C-Line (©)</Label>
                  <Input
                    id="cLine"
                    value={formData.cLine}
                    onChange={(e) => setFormData({ ...formData, cLine: e.target.value })}
                    placeholder="C-Line information"
                  />
                </div>
                <div>
                  <Label htmlFor="pLine">P-Line (℗)</Label>
                  <Input
                    id="pLine"
                    value={formData.pLine}
                    onChange={(e) => setFormData({ ...formData, pLine: e.target.value })}
                    placeholder="P-Line information"
                  />
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
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
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

        {/* Step 3: Upload Audio */}
        {currentStep === 3 && (
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
            <CardHeader>
              <CardTitle>Upload Audio File</CardTitle>
              <CardDescription>Upload your audio file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="audio"
                  accept="audio/wav,audio/flac,audio/aiff,audio/x-ms-wma"
                  onChange={handleAudioChange}
                  className="hidden"
                />
                <label htmlFor="audio" className="cursor-pointer">
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {audioFile ? audioFile.name : "Select an audio file or drag here to upload"}
                    </p>
                    <p className="text-xs text-muted-foreground">WAV (PCM), FLAC, AIFF, WMA (Lossless) only</p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Metadata Details */}
        {currentStep === 4 && (
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
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
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
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
          <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
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
            <Button onClick={handleSubmit} disabled={loading || uploading}>
              {loading ? "Submitting..." : "Submit Release"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateRelease;
