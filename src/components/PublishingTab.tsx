import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Music, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";
import { z } from "zod";

const publishingSchema = z.object({
  song_title: z.string().trim().min(1, "Song title is required").max(255),
  song_type: z.string().min(1, "Song type is required"),
  isrcs: z.array(z.string().trim().regex(/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/, "Invalid ISRC format")).min(1, "At least one ISRC is required"),
  alternate_titles: z.array(z.string().trim().max(255)).optional(),
  performers: z.array(z.string().trim().max(255)).optional(),
  genre: z.string().optional(),
  has_third_party_content: z.boolean(),
  has_public_domain_content: z.boolean(),
  shareholders: z.array(z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    perf_share: z.number().min(0).max(100),
  })).min(1, "At least one shareholder is required"),
  publishers: z.array(z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    perf_share: z.number().min(0).max(100),
    pro: z.string().optional(),
    ipi: z.string().optional(),
  })).min(1, "At least one publisher is required"),
});

interface PublishingTabProps {
  userId: string;
}

const PublishingTab = ({ userId }: PublishingTabProps) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [songTitle, setSongTitle] = useState("");
  const [songType, setSongType] = useState("");
  const [isrcs, setIsrcs] = useState<string[]>([""]);
  const [alternateTitles, setAlternateTitles] = useState<string[]>([]);
  const [performers, setPerformers] = useState<string[]>([]);
  const [genre, setGenre] = useState("");
  const [hasThirdParty, setHasThirdParty] = useState(false);
  const [hasPublicDomain, setHasPublicDomain] = useState(false);
  const [shareholders, setShareholders] = useState<any[]>([{ name: "", role: "Composer/Author (CA)", perf_share: 0 }]);
  const [publishers, setPublishers] = useState<any[]>([{ 
    name: "XZ1 MUSIC PUBLISHING", 
    role: "Publisher (E)", 
    perf_share: 30, 
    pro: "AllTrack", 
    ipi: "01280759627" 
  }]);

  // Prefill dialog state
  const [showPrefillDialog, setShowPrefillDialog] = useState(false);
  const [matchedTrack, setMatchedTrack] = useState<any>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [userId]);

  useEffect(() => {
    // Debounce the track search to avoid too many queries
    const timer = setTimeout(() => {
      if (songTitle.trim().length > 2) {
        checkForMatchingTrack();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [songTitle]);

  const checkForMatchingTrack = async () => {
    if (!songTitle.trim()) return;

    try {
      // First get all releases for this user
      const { data: releases, error: releasesError } = await supabase
        .from("releases")
        .select("id")
        .eq("user_id", userId);

      if (releasesError || !releases || releases.length === 0) return;

      const releaseIds = releases.map(r => r.id);

      // Then search for matching tracks in those releases
      const { data: tracks, error: tracksError } = await supabase
        .from("tracks")
        .select("*")
        .in("release_id", releaseIds)
        .ilike("title", songTitle.trim());

      if (tracksError || !tracks || tracks.length === 0) return;

      // Found a match - show the prefill dialog
      setMatchedTrack(tracks[0]);
      setShowPrefillDialog(true);
    } catch (error) {
      console.error("Error checking for matching track:", error);
    }
  };

  const handlePrefillFromTrack = () => {
    if (!matchedTrack) return;

    // Prefill ISRCs
    if (matchedTrack.isrc) {
      setIsrcs([matchedTrack.isrc]);
    }

    // Prefill performers from featured artists
    if (matchedTrack.featured_artists && Array.isArray(matchedTrack.featured_artists)) {
      const validPerformers = matchedTrack.featured_artists.filter((p: string) => p && p.trim());
      if (validPerformers.length > 0) {
        setPerformers(validPerformers);
      }
    }

    // Prefill shareholders from composer/writer/contributor
    const newShareholders: any[] = [];
    if (matchedTrack.composer) {
      newShareholders.push({
        name: matchedTrack.composer,
        role: "Composer (C)",
        perf_share: 0,
      });
    }
    if (matchedTrack.writer) {
      newShareholders.push({
        name: matchedTrack.writer,
        role: "Composer/Author (CA)",
        perf_share: 0,
      });
    }
    if (matchedTrack.contributor && matchedTrack.contributor !== matchedTrack.composer && matchedTrack.contributor !== matchedTrack.writer) {
      newShareholders.push({
        name: matchedTrack.contributor,
        role: "Composer/Author (CA)",
        perf_share: 0,
      });
    }

    if (newShareholders.length > 0) {
      setShareholders(newShareholders);
    }

    // Prefill publisher info
    if (matchedTrack.publisher) {
      setPublishers([{
        name: matchedTrack.publisher,
        role: "Publisher (E)",
        perf_share: 0,
        pro: "",
        ipi: matchedTrack.publisher_ipi || "",
      }]);
    }

    setShowPrefillDialog(false);
    setMatchedTrack(null);
    toast.success("Form prefilled with track information");
  };

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("publishing_submissions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load submissions");
      console.error(error);
      return;
    }

    setSubmissions(data || []);
    setLoading(false);
  };

  const calculateTotalShare = () => {
    const shareholderTotal = shareholders.reduce((sum, s) => sum + (parseFloat(s.perf_share) || 0), 0);
    const publisherTotal = publishers.reduce((sum, p) => sum + (parseFloat(p.perf_share) || 0), 0);
    return shareholderTotal + publisherTotal;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalShare = calculateTotalShare();
    if (totalShare !== 100) {
      toast.error(`Total performance share must equal 100% (currently ${totalShare.toFixed(3)}%)`);
      return;
    }

    try {
      const validatedData = publishingSchema.parse({
        song_title: songTitle,
        song_type: songType,
        isrcs: isrcs.filter(i => i.trim()),
        alternate_titles: alternateTitles.filter(t => t.trim()),
        performers: performers.filter(p => p.trim()),
        genre,
        has_third_party_content: hasThirdParty,
        has_public_domain_content: hasPublicDomain,
        shareholders,
        publishers,
      });

      const { error } = await supabase
        .from("publishing_submissions")
        .insert({
          user_id: userId,
          song_title: validatedData.song_title,
          song_type: validatedData.song_type,
          isrcs: validatedData.isrcs,
          alternate_titles: validatedData.alternate_titles || [],
          performers: validatedData.performers || [],
          genre: validatedData.genre || null,
          has_third_party_content: validatedData.has_third_party_content,
          has_public_domain_content: validatedData.has_public_domain_content,
          shareholders: validatedData.shareholders,
          publishers: validatedData.publishers,
        });

      if (error) throw error;

      toast.success("Publishing submission created successfully");
      resetForm();
      setShowForm(false);
      fetchSubmissions();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to submit: " + error.message);
      }
    }
  };

  const resetForm = () => {
    setSongTitle("");
    setSongType("");
    setIsrcs([""]);
    setAlternateTitles([]);
    setPerformers([]);
    setGenre("");
    setHasThirdParty(false);
    setHasPublicDomain(false);
    setShareholders([{ name: "", role: "Composer/Author (CA)", perf_share: 0 }]);
    setPublishers([{ 
      name: "XZ1 MUSIC PUBLISHING", 
      role: "Publisher (E)", 
      perf_share: 30, 
      pro: "AllTrack", 
      ipi: "01280759627" 
    }]);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: any; className: string }> = {
      pending: { icon: Clock, className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
      "sent to pro": { icon: CheckCircle2, className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
      "declined for publishing": { icon: XCircle, className: "bg-red-500/20 text-red-300 border-red-500/30" },
    };

    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;

    return (
      <Badge variant="outline" className={variant.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prefill Dialog */}
      <Dialog open={showPrefillDialog} onOpenChange={setShowPrefillDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Match Found!
            </DialogTitle>
            <DialogDescription className="text-left">
              We found a track that matches this name in your releases. Would you like to prefill information from it?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {matchedTrack && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <p className="text-sm font-medium">Track: {matchedTrack.title}</p>
                {matchedTrack.isrc && (
                  <p className="text-xs text-muted-foreground">ISRC: {matchedTrack.isrc}</p>
                )}
                {matchedTrack.composer && (
                  <p className="text-xs text-muted-foreground">Composer: {matchedTrack.composer}</p>
                )}
                {matchedTrack.writer && (
                  <p className="text-xs text-muted-foreground">Writer: {matchedTrack.writer}</p>
                )}
                {matchedTrack.publisher && (
                  <p className="text-xs text-muted-foreground">Publisher: {matchedTrack.publisher}</p>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPrefillDialog(false);
                  setMatchedTrack(null);
                }}
              >
                No, Continue Manually
              </Button>
              <Button
                onClick={handlePrefillFromTrack}
                className="bg-gradient-primary"
              >
                Yes, Prefill Information
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold text-left">Publishing Submissions</CardTitle>
              <CardDescription className="text-left">Submit songs for publishing and royalty tracking</CardDescription>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add New Song
              </Button>
            )}
          </div>
        </CardHeader>

        {showForm && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="song_title">Song Title *</Label>
                  <Input
                    id="song_title"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="Song Title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="song_type">Song Type *</Label>
                  <Select value={songType} onValueChange={setSongType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Please Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">Original</SelectItem>
                      <SelectItem value="cover">Cover</SelectItem>
                      <SelectItem value="remix">Remix</SelectItem>
                      <SelectItem value="instrumental">Instrumental</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>ISRCs *</Label>
                {isrcs.map((isrc, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={isrc}
                      onChange={(e) => {
                        const newIsrcs = [...isrcs];
                        newIsrcs[idx] = e.target.value;
                        setIsrcs(newIsrcs);
                      }}
                      placeholder="ISRC (ex: USRC12345678)"
                    />
                    {idx > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsrcs(isrcs.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsrcs([...isrcs, ""])}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Add Another ISRC
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Alternate Titles (recommended)</Label>
                {alternateTitles.map((title, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={title}
                      onChange={(e) => {
                        const newTitles = [...alternateTitles];
                        newTitles[idx] = e.target.value;
                        setAlternateTitles(newTitles);
                      }}
                      placeholder="Song Title (Live Version)"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setAlternateTitles(alternateTitles.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAlternateTitles([...alternateTitles, ""])}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Add Another Alt Title
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Performers (recommended)</Label>
                {performers.map((performer, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={performer}
                      onChange={(e) => {
                        const newPerformers = [...performers];
                        newPerformers[idx] = e.target.value;
                        setPerformers(newPerformers);
                      }}
                      placeholder="Performer Name"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setPerformers(performers.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPerformers([...performers, ""])}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Add Another Performer
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genre">Genre (recommended)</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pop">Pop</SelectItem>
                    <SelectItem value="rock">Rock</SelectItem>
                    <SelectItem value="hip-hop">Hip Hop</SelectItem>
                    <SelectItem value="electronic">Electronic</SelectItem>
                    <SelectItem value="r&b">R&B</SelectItem>
                    <SelectItem value="country">Country</SelectItem>
                    <SelectItem value="jazz">Jazz</SelectItem>
                    <SelectItem value="classical">Classical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="third_party"
                    checked={hasThirdParty}
                    onCheckedChange={(checked) => setHasThirdParty(checked as boolean)}
                  />
                  <Label htmlFor="third_party" className="cursor-pointer">
                    This song contains 3rd party content (i.e. samples)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="public_domain"
                    checked={hasPublicDomain}
                    onCheckedChange={(checked) => setHasPublicDomain(checked as boolean)}
                  />
                  <Label htmlFor="public_domain" className="cursor-pointer">
                    This song contains public domain content
                  </Label>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold text-left">Shareholders</h3>
                {shareholders.map((shareholder, idx) => (
                  <div key={idx} className="grid gap-4 sm:grid-cols-3 p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-2">
                      <Label>Writer Name *</Label>
                      <Input
                        value={shareholder.name}
                        onChange={(e) => {
                          const newShareholders = [...shareholders];
                          newShareholders[idx].name = e.target.value;
                          setShareholders(newShareholders);
                        }}
                        placeholder="Writer Name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role *</Label>
                      <Select
                        value={shareholder.role}
                        onValueChange={(value) => {
                          const newShareholders = [...shareholders];
                          newShareholders[idx].role = value;
                          setShareholders(newShareholders);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Composer/Author (CA)">Composer/Author (CA)</SelectItem>
                          <SelectItem value="Lyricist (A)">Lyricist (A)</SelectItem>
                          <SelectItem value="Composer (C)">Composer (C)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Perf Share % *</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          max="100"
                          value={shareholder.perf_share}
                          onChange={(e) => {
                            const newShareholders = [...shareholders];
                            newShareholders[idx].perf_share = parseFloat(e.target.value) || 0;
                            setShareholders(newShareholders);
                          }}
                          placeholder="000.000"
                          required
                        />
                        {idx > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShareholders(shareholders.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShareholders([...shareholders, { name: "", role: "Composer/Author (CA)", perf_share: 0 }])}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Add Shareholder
                </Button>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold text-left">Publishers</h3>
                <div className="text-sm text-muted-foreground mb-2 bg-primary/10 p-3 rounded-md border border-primary/20">
                  <strong>Note:</strong> XZ1 Music Publishing is automatically included at 30% share. You can add additional publishers below.
                </div>
                {publishers.map((publisher, idx) => (
                  <div key={idx} className="grid gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Publisher Name *</Label>
                        <Input
                          value={publisher.name}
                          onChange={(e) => {
                            const newPublishers = [...publishers];
                            newPublishers[idx].name = e.target.value;
                            setPublishers(newPublishers);
                          }}
                          placeholder="Publisher Name"
                          required
                          disabled={idx === 0}
                          className={idx === 0 ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role *</Label>
                        <Select
                          value={publisher.role}
                          onValueChange={(value) => {
                            const newPublishers = [...publishers];
                            newPublishers[idx].role = value;
                            setPublishers(newPublishers);
                          }}
                          disabled={idx === 0}
                        >
                          <SelectTrigger className={idx === 0 ? "bg-muted/50 cursor-not-allowed" : ""}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Publisher (E)">Publisher (E)</SelectItem>
                            <SelectItem value="Administrator (AM)">Administrator (AM)</SelectItem>
                            <SelectItem value="Sub-Publisher (SE)">Sub-Publisher (SE)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Perf Share % *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          max="100"
                          value={publisher.perf_share}
                          onChange={(e) => {
                            const newPublishers = [...publishers];
                            newPublishers[idx].perf_share = parseFloat(e.target.value) || 0;
                            setPublishers(newPublishers);
                          }}
                          placeholder="000.000"
                          required
                          disabled={idx === 0}
                          className={idx === 0 ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PRO</Label>
                        <Input
                          value={publisher.pro}
                          onChange={(e) => {
                            const newPublishers = [...publishers];
                            newPublishers[idx].pro = e.target.value;
                            setPublishers(newPublishers);
                          }}
                          placeholder="PRO Name"
                          disabled={idx === 0}
                          className={idx === 0 ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>IPI</Label>
                        <Input
                          value={publisher.ipi}
                          onChange={(e) => {
                            const newPublishers = [...publishers];
                            newPublishers[idx].ipi = e.target.value;
                            setPublishers(newPublishers);
                          }}
                          placeholder="IPI Number"
                          disabled={idx === 0}
                          className={idx === 0 ? "bg-muted/50 cursor-not-allowed" : ""}
                        />
                      </div>
                    </div>
                    {idx > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPublishers(publishers.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Remove Publisher
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPublishers([...publishers, { name: "", role: "Publisher (E)", perf_share: 0, pro: "", ipi: "" }])}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Add Publisher
                </Button>
              </div>

              <Card className={`${calculateTotalShare() === 100 ? 'border-green-500/50' : 'border-destructive/50'}`}>
                <CardHeader>
                  <CardTitle className="text-left">Shareholder Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left">Shareholder</TableHead>
                        <TableHead className="text-left">Role</TableHead>
                        <TableHead className="text-left">Perf Share %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shareholders.map((s, idx) => (
                        <TableRow key={`s-${idx}`}>
                          <TableCell>{s.name || "—"}</TableCell>
                          <TableCell>{s.role}</TableCell>
                          <TableCell>{s.perf_share.toFixed(3)}%</TableCell>
                        </TableRow>
                      ))}
                      {publishers.map((p, idx) => (
                        <TableRow key={`p-${idx}`}>
                          <TableCell>{p.name || "—"}</TableCell>
                          <TableCell>{p.role}</TableCell>
                          <TableCell>{p.perf_share.toFixed(3)}%</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell colSpan={2}>TOTAL (Perf must equal 100%)</TableCell>
                        <TableCell className={calculateTotalShare() === 100 ? "text-green-500" : "text-destructive"}>
                          {calculateTotalShare().toFixed(3)}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" className="bg-gradient-primary">
                  Submit Song
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {!showForm && (
        <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
          <CardHeader>
            <CardTitle className="text-left">Your Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No publishing submissions yet</p>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-left">Song Title</TableHead>
                      <TableHead className="text-left">Type</TableHead>
                      <TableHead className="text-left">Genre</TableHead>
                      <TableHead className="text-left">Status</TableHead>
                      <TableHead className="text-left">Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.song_title}</TableCell>
                        <TableCell>{submission.song_type}</TableCell>
                        <TableCell>{submission.genre || "—"}</TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>{new Date(submission.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PublishingTab;
