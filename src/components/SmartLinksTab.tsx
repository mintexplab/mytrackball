import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast-with-sound";
import { ExternalLink, Link as LinkIcon, Loader2, Copy, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
interface SmartLink {
  id: string;
  spotify_url: string;
  smart_link_url: string;
  title: string;
  created_at: string;
}
export const SmartLinksTab = () => {
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [smartLink, setSmartLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedLinks, setSavedLinks] = useState<SmartLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);

  // Fetch saved smart links
  useEffect(() => {
    fetchSavedLinks();
  }, []);
  const fetchSavedLinks = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from('smart_links').select('*').eq('user_id', user.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setSavedLinks(data || []);
    } catch (error: any) {
      console.error("Error fetching smart links:", error);
    } finally {
      setLoadingLinks(false);
    }
  };
  const deleteSmartLink = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from('smart_links').delete().eq('id', id);
      if (error) throw error;
      toast.success("Smart link deleted");
      fetchSavedLinks();
    } catch (error: any) {
      console.error("Error deleting smart link:", error);
      toast.error("Failed to delete smart link");
    }
  };
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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to generate smart links");
        return;
      }
      const {
        data,
        error
      } = await supabase.functions.invoke("generate-smartlink", {
        body: {
          spotifyUrl,
          userId: user.id
        }
      });
      if (error) throw error;
      if (data?.smartlink) {
        setSmartLink(data.smartlink);
        toast.success("Smart link generated successfully!");
        fetchSavedLinks(); // Refresh the list
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
  return <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Smart Links (Experimental) </h2>
        <p className="text-muted-foreground mt-1">This feCreate universal smart links for your music</p>
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
              <Input id="spotify-url" placeholder="https://open.spotify.com/track/..." value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} className="bg-background border-border" disabled={loading} />
              <Button onClick={generateSmartLink} disabled={loading || !spotifyUrl.trim()} className="bg-gradient-primary hover:opacity-90 shrink-0">
                {loading ? <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </> : <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Generate
                  </>}
              </Button>
            </div>
          </div>

          {smartLink && <div className="space-y-3 p-4 bg-gradient-primary/10 border border-primary/20 rounded-lg">
              <Label>Your Smart Link</Label>
              <div className="flex gap-2">
                <Input value={smartLink} readOnly className="bg-background border-border font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={copyToClipboard} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => window.open(smartLink, "_blank")} className="shrink-0">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with your fans. It will automatically direct them to their preferred streaming platform.
              </p>
            </div>}
        </CardContent>
      </Card>

      {/* Saved Smart Links */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Your Smart Links</CardTitle>
          <CardDescription>
            Manage all your previously created smart links
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLinks ? <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Loading your smart links...</p>
            </div> : savedLinks.length === 0 ? <div className="text-center py-8">
              <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No smart links created yet</p>
              <p className="text-sm text-muted-foreground/70">Generate your first smart link above</p>
            </div> : <div className="space-y-4">
              {savedLinks.map(link => <div key={link.id} className="p-4 bg-background border border-border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{link.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(link.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteSmartLink(link.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Spotify URL</Label>
                    <p className="text-sm text-muted-foreground truncate">{link.spotify_url}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Smart Link</Label>
                    <div className="flex gap-2">
                      <Input value={link.smart_link_url} readOnly className="text-sm font-mono" />
                      <Button size="sm" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(link.smart_link_url);
                  toast.success("Link copied to clipboard!");
                }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => window.open(link.smart_link_url, '_blank')}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>)}
            </div>}
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
            <p>We'll create a universal smart link through ToneDen with your custom stream.trackball.cc domain</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
            <p>Share the link and let your fans choose their favorite platform</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">4</div>
            <p>Manage all your smart links from this dashboard</p>
          </div>
        </CardContent>
      </Card>
    </div>;
};