import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileSpreadsheet, Music, Image as ImageIcon, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AudioPlayer } from "./AudioPlayer";
import { Progress } from "@/components/ui/progress";

interface ParsedRelease {
  title: string;
  artist_name: string;
  genre?: string;
  release_date?: string;
  label_name?: string;
  upc?: string;
  featured_artists?: string;
  copyright_line?: string;
  phonographic_line?: string;
  catalog_number?: string;
  audioFile?: File;
  artworkFile?: File;
  audioPreviewUrl?: string;
  artworkPreviewUrl?: string;
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

const BulkUploadTab = ({ userId }: { userId: string }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedReleases, setParsedReleases] = useState<ParsedRelease[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const downloadTemplate = () => {
    const headers = [
      "title",
      "artist_name",
      "genre",
      "release_date",
      "label_name",
      "upc",
      "featured_artists",
      "copyright_line",
      "phonographic_line",
      "catalog_number"
    ];
    
    const csvContent = headers.join(",") + "\n" + 
      "Example Song,Example Artist,Pop,2025-12-31,Example Label,123456789012,Featured Artist,© 2025 Example,℗ 2025 Example,CAT001";
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-upload-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setCsvFile(file);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const releases: ParsedRelease[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const release: ParsedRelease = {
          title: values[0] || '',
          artist_name: values[1] || '',
          genre: values[2] || undefined,
          release_date: values[3] || undefined,
          label_name: values[4] || undefined,
          upc: values[5] || undefined,
          featured_artists: values[6] || undefined,
          copyright_line: values[7] || undefined,
          phonographic_line: values[8] || undefined,
          catalog_number: values[9] || undefined,
          uploadStatus: 'pending'
        };
        
        if (release.title && release.artist_name) {
          releases.push(release);
        }
      }
      
      setParsedReleases(releases);
      toast.success(`Parsed ${releases.length} releases from CSV`);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast.error("Failed to parse CSV file");
    }
  };

  const handleAudioUpload = (index: number, file: File) => {
    const updated = [...parsedReleases];
    updated[index].audioFile = file;
    updated[index].audioPreviewUrl = URL.createObjectURL(file);
    setParsedReleases(updated);
    toast.success(`Audio file added for ${updated[index].title}`);
  };

  const handleArtworkUpload = (index: number, file: File) => {
    const updated = [...parsedReleases];
    updated[index].artworkFile = file;
    updated[index].artworkPreviewUrl = URL.createObjectURL(file);
    setParsedReleases(updated);
    toast.success(`Artwork added for ${updated[index].title}`);
  };

  const uploadRelease = async (release: ParsedRelease, index: number) => {
    try {
      // Update status to uploading
      const updated = [...parsedReleases];
      updated[index].uploadStatus = 'uploading';
      setParsedReleases(updated);

      let artworkUrl = null;
      let audioUrl = null;

      // Upload artwork if provided
      if (release.artworkFile) {
        const artworkPath = `${userId}/${Date.now()}-${release.artworkFile.name}`;
        const { error: artworkError } = await supabase.storage
          .from('release-artwork')
          .upload(artworkPath, release.artworkFile);

        if (artworkError) throw artworkError;

        const { data: { publicUrl } } = supabase.storage
          .from('release-artwork')
          .getPublicUrl(artworkPath);
        
        artworkUrl = publicUrl;
      }

      // Upload audio if provided
      if (release.audioFile) {
        const audioPath = `${userId}/${Date.now()}-${release.audioFile.name}`;
        const { error: audioError } = await supabase.storage
          .from('release-audio')
          .upload(audioPath, release.audioFile);

        if (audioError) throw audioError;

        const { data: { publicUrl } } = supabase.storage
          .from('release-audio')
          .getPublicUrl(audioPath);
        
        audioUrl = publicUrl;
      }

      // Create release in database
      const { error: dbError } = await supabase
        .from('releases')
        .insert({
          user_id: userId,
          title: release.title,
          artist_name: release.artist_name,
          genre: release.genre,
          release_date: release.release_date,
          label_name: release.label_name,
          upc: release.upc,
          featured_artists: release.featured_artists ? [release.featured_artists] : null,
          copyright_line: release.copyright_line,
          phonographic_line: release.phonographic_line,
          catalog_number: release.catalog_number,
          artwork_url: artworkUrl,
          audio_file_url: audioUrl,
          status: 'pending'
        });

      if (dbError) throw dbError;

      // Update status to success
      updated[index].uploadStatus = 'success';
      setParsedReleases(updated);
      
      return true;
    } catch (error: any) {
      console.error("Error uploading release:", error);
      const updated = [...parsedReleases];
      updated[index].uploadStatus = 'error';
      updated[index].errorMessage = error.message;
      setParsedReleases(updated);
      return false;
    }
  };

  const handleBulkUpload = async () => {
    if (parsedReleases.length === 0) {
      toast.error("No releases to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < parsedReleases.length; i++) {
      const success = await uploadRelease(parsedReleases[i], i);
      if (success) successCount++;
      else failCount++;
      
      setUploadProgress(((i + 1) / parsedReleases.length) * 100);
    }

    setUploading(false);
    
    if (failCount === 0) {
      toast.success(`Successfully uploaded ${successCount} releases!`);
    } else {
      toast.warning(`Uploaded ${successCount} releases, ${failCount} failed`);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Bulk Release Upload</CardTitle>
          <CardDescription>
            Upload multiple releases at once using a CSV file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
              
              <div className="flex-1">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Label htmlFor="csv-upload">
                  <div className="flex items-center justify-center gap-2 p-2 border border-border rounded-md cursor-pointer hover:bg-muted transition-colors">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{csvFile ? csvFile.name : "Upload CSV"}</span>
                  </div>
                </Label>
              </div>
            </div>
          </div>

          {parsedReleases.length > 0 && (
            <>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Releases ({parsedReleases.length})
                  </h3>
                  <Button
                    onClick={handleBulkUpload}
                    disabled={uploading}
                    className="bg-gradient-primary hover:opacity-90 transition-opacity"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload All Releases"}
                  </Button>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-muted-foreground text-center">
                      {Math.round(uploadProgress)}% complete
                    </p>
                  </div>
                )}

                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {parsedReleases.map((release, index) => (
                    <Card key={index} className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-foreground">
                                  {release.title}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {release.artist_name}
                                </p>
                              </div>
                              {release.uploadStatus === 'success' && (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              )}
                              {release.uploadStatus === 'error' && (
                                <AlertCircle className="w-5 h-5 text-destructive" />
                              )}
                            </div>

                            {release.errorMessage && (
                              <p className="text-xs text-destructive">
                                {release.errorMessage}
                              </p>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs">Audio File</Label>
                                {release.audioFile ? (
                                  <div className="mt-2">
                                    <AudioPlayer
                                      src={release.audioPreviewUrl!}
                                      title={release.title}
                                      artist={release.artist_name}
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <Input
                                      type="file"
                                      accept="audio/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleAudioUpload(index, file);
                                      }}
                                      className="hidden"
                                      id={`audio-${index}`}
                                      disabled={uploading}
                                    />
                                    <Label htmlFor={`audio-${index}`}>
                                      <div className="flex items-center justify-center gap-2 p-2 mt-2 border border-border rounded-md cursor-pointer hover:bg-muted transition-colors">
                                        <Music className="w-4 h-4" />
                                        <span className="text-xs">Upload Audio</span>
                                      </div>
                                    </Label>
                                  </>
                                )}
                              </div>

                              <div>
                                <Label className="text-xs">Artwork</Label>
                                {release.artworkFile ? (
                                  <div className="mt-2">
                                    <img
                                      src={release.artworkPreviewUrl}
                                      alt="Artwork preview"
                                      className="w-full h-24 object-cover rounded-md border border-border"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleArtworkUpload(index, file);
                                      }}
                                      className="hidden"
                                      id={`artwork-${index}`}
                                      disabled={uploading}
                                    />
                                    <Label htmlFor={`artwork-${index}`}>
                                      <div className="flex items-center justify-center gap-2 p-2 mt-2 border border-border rounded-md cursor-pointer hover:bg-muted transition-colors">
                                        <ImageIcon className="w-4 h-4" />
                                        <span className="text-xs">Upload Artwork</span>
                                      </div>
                                    </Label>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkUploadTab;