import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Palette, Image as ImageIcon, Upload } from "lucide-react";
import { useS3Upload } from "@/hooks/useS3Upload";

interface Label {
  id: string;
  name: string;
  label_id: string;
  accent_color: string | null;
  logo_url: string | null;
}

interface LabelBanner {
  id: string;
  banner_url: string;
  label_id: string;
}

export const LabelCustomizationTab = () => {
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string>("");
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null);
  const [banner, setBanner] = useState<LabelBanner | null>(null);
  const [loading, setLoading] = useState(false);
  const [accentColor, setAccentColor] = useState("#ef4444");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const { uploadFile, uploading } = useS3Upload();

  useEffect(() => {
    fetchLabels();
  }, []);

  useEffect(() => {
    if (selectedLabelId) {
      const label = labels.find(l => l.id === selectedLabelId);
      setSelectedLabel(label || null);
      if (label) {
        setAccentColor(label.accent_color || "#ef4444");
        fetchBanner(label.id);
      }
    }
  }, [selectedLabelId, labels]);

  const fetchLabels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("labels")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLabels(data || []);
      if (data && data.length > 0) {
        setSelectedLabelId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching labels:", error);
      toast.error("Failed to load labels");
    }
  };

  const fetchBanner = async (labelId: string) => {
    try {
      const { data, error } = await supabase
        .from("label_dropdown_banners")
        .select("*")
        .eq("label_id", labelId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setBanner(data);
    } catch (error: any) {
      console.error("Error fetching banner:", error);
    }
  };

  const handleSave = async () => {
    if (!selectedLabel) {
      toast.error("Please select a label");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload logo if selected
      let logoUrl = selectedLabel.logo_url;
      if (logoFile) {
        const uploadedLogoUrl = await uploadFile({
          file: logoFile,
          path: `label-logos/${user.id}/${Date.now()}-${logoFile.name}`,
        });
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl;
        }
      }

      // Update label with accent color and logo
      const { error: labelError } = await supabase
        .from("labels")
        .update({
          accent_color: accentColor,
          logo_url: logoUrl,
        })
        .eq("id", selectedLabel.id);

      if (labelError) throw labelError;

      // Upload banner if selected
      if (bannerFile) {
        const uploadedBannerUrl = await uploadFile({
          file: bannerFile,
          path: `label-banners/${user.id}/${Date.now()}-${bannerFile.name}`,
        });
        if (uploadedBannerUrl) {
          if (banner) {
            // Update existing banner
            const { error: bannerError } = await supabase
              .from("label_dropdown_banners")
              .update({
                banner_url: uploadedBannerUrl,
                updated_at: new Date().toISOString(),
              })
              .eq("id", banner.id);

            if (bannerError) throw bannerError;
          } else {
            // Create new banner
            const { error: bannerError } = await supabase
              .from("label_dropdown_banners")
              .insert({
                label_id: selectedLabel.id,
                banner_url: uploadedBannerUrl,
                created_by: user.id,
              });

            if (bannerError) throw bannerError;
          }
        }
      }

      toast.success("Label customization saved successfully!");
      
      // Refresh data
      await fetchLabels();
      if (selectedLabel.id) {
        await fetchBanner(selectedLabel.id);
      }
      
      // Clear file inputs
      setLogoFile(null);
      setBannerFile(null);
    } catch (error: any) {
      console.error("Error saving customization:", error);
      toast.error(error.message || "Failed to save customization");
    } finally {
      setLoading(false);
    }
  };

  if (labels.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Label Customization</CardTitle>
          <CardDescription>
            You don't have any labels yet. Create a label first to customize it.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            Label Customization
          </CardTitle>
          <CardDescription>
            Customize the branding for your labels. Changes will apply to all subaccounts under each label.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Label Selection */}
          <div className="space-y-2">
            <Label>Select Label</Label>
            <Select value={selectedLabelId} onValueChange={setSelectedLabelId}>
              <SelectTrigger className="bg-background/50 border-border">
                <SelectValue placeholder="Select a label to customize" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {labels.map((label) => (
                  <SelectItem key={label.id} value={label.id}>
                    {label.name} (ID: {label.label_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLabel && (
            <>
              {/* Accent Color */}
              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="accentColor"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-12 w-24 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#ef4444"
                    className="flex-1 bg-background/50 border-border"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This color will be used throughout the label's branding
                </p>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label htmlFor="logo">Label Logo</Label>
                {selectedLabel.logo_url && !logoFile && (
                  <div className="mb-3 p-4 border border-border rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-2">Current Logo:</p>
                    <img
                      src={selectedLabel.logo_url}
                      alt="Current logo"
                      className="max-h-24 rounded-lg border border-border"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("Logo file must be less than 5MB");
                          return;
                        }
                        setLogoFile(file);
                      }
                    }}
                    className="flex-1 bg-background/50 border-border cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const input = document.getElementById("logo") as HTMLInputElement;
                      input?.click();
                    }}
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                </div>
                {logoFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {logoFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload a square logo (recommended: 256x256px, max 5MB)
                </p>
              </div>

              {/* Dropdown Banner Upload */}
              <div className="space-y-2">
                <Label htmlFor="banner">Dropdown Banner</Label>
                {banner && !bannerFile && (
                  <div className="mb-3 p-4 border border-border rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-2">Current Banner:</p>
                    <img
                      src={banner.banner_url}
                      alt="Current banner"
                      className="w-full max-h-32 object-cover rounded-lg border border-border"
                    />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Input
                    id="banner"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("Banner file must be less than 5MB");
                          return;
                        }
                        setBannerFile(file);
                      }
                    }}
                    className="flex-1 bg-background/50 border-border cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const input = document.getElementById("banner") as HTMLInputElement;
                      input?.click();
                    }}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                {bannerFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {bannerFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Recommended size: 1200x300px (max 5MB)
                </p>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={loading || uploading}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {(loading || uploading) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Customization"
                )}
              </Button>

              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> These customizations will automatically apply to all subaccounts 
                  under this label. Subaccounts will inherit the accent color, logo, and dropdown banner.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
