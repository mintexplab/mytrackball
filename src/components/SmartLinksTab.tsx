import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExternalLink, Link as LinkIcon, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const SmartLinksTab = () => {
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [smartLink, setSmartLink] = useState("");
  const [copied, setCopied] = useState(false);

  const generateSmartLink = async () => {
    if (!spotifyUrl.trim()) {
      toast.error("Please enter a Spotify link");
      return;
    }

    // Validate Spotify URL
    if (!spotifyUrl.includes("spotify.com")) {
      toast.error("Please enter a valid Spotify URL");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-smartlink", {
        body: { spotifyUrl }
      });

      if (error) throw error;

      if (data?.smartlink) {
        setSmartLink(data.smartlink);
        toast.success("Smart link generated successfully!");
      } else {
        throw new Error("No smart link returned");
      }
    } catch (error: any) {
      console.error("Error generating smart link:", error);
      toast.error(error.message || "Failed to generate smart link");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(smartLink);
    setCopied(true);
    toast.success("Smart link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Smart Links</h2>
        <p className="text-muted-foreground mt-1">Create universal smart links for your music</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Generate Smart Link
          </CardTitle>
          <CardDescription>
            Enter a Spotify link to create a smart link that directs fans to all streaming platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="spotify-url">Spotify Track/Album URL</Label>
            <div className="flex gap-2">
              <Input
                id="spotify-url"
                placeholder="https://open.spotify.com/track/..."
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                className="bg-background border-border"
                disabled={loading}
              />
              <Button 
                onClick={generateSmartLink}
                disabled={loading || !spotifyUrl.trim()}
                className="bg-gradient-primary hover:opacity-90 shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>

          {smartLink && (
            <div className="space-y-3 p-4 bg-gradient-primary/10 border border-primary/20 rounded-lg">
              <Label>Your Smart Link</Label>
              <div className="flex gap-2">
                <Input
                  value={smartLink}
                  readOnly
                  className="bg-background border-border font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(smartLink, "_blank")}
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with your fans. It will automatically direct them to their preferred streaming platform.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-lg">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
            <p>Enter a Spotify link for your track or album</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
            <p>We'll fetch links from all major streaming platforms (Apple Music, YouTube Music, Tidal, Deezer, and more)</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
            <p>Get a custom stream.trackball.cc smart link that works everywhere</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">4</div>
            <p>Share the link and let your fans choose their favorite platform</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};