import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Palette, Image as ImageIcon, Upload, Lock } from "lucide-react";
import { useS3Upload } from "@/hooks/useS3Upload";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [userPlan, setUserPlan] = useState<any>(null);
  const [labelType, setLabelType] = useState<string | null>(null);
  const { uploadFile, uploading } = useS3Upload();

  useEffect(() => {
    fetchLabels();
    fetchUserPlanAndType();
  }, []);

  const fetchUserPlanAndType = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: planData } = await supabase
      .from("user_plans")
      .select("*, plan:plans(*)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    const { data: profileData } = await supabase
      .from("profiles")
      .select("label_type")
      .eq("id", user.id)
      .single();

    setUserPlan(planData);
    setLabelType(profileData?.label_type);
  };

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

      // Get master account's own active label
      const { data: masterProfile } = await supabase
        .from("profiles")
        .select("active_label_id")
        .eq("id", user.id)
        .single();

      // Get subaccounts and their active labels
      const { data: subProfiles } = await supabase
        .from("profiles")
        .select("active_label_id")
        .eq("parent_account_id", user.id);

      const labelIds = new Set<string>();
      if (masterProfile?.active_label_id) {
        labelIds.add(masterProfile.active_label_id);
      }
      (subProfiles || []).forEach((p: any) => {
        if (p.active_label_id) {
          labelIds.add(p.active_label_id);
        }
      });

      if (labelIds.size === 0) {
        setLabels([]);
        setSelectedLabelId("");
        return;
      }

      const { data, error } = await supabase
        .from("labels")
        .select("*")
        .in("id", Array.from(labelIds));

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
          path: `${user.id}/label-logos/${Date.now()}-${logoFile.name}`,
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
          path: `${user.id}/label-banners/${Date.now()}-${bannerFile.name}`,
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

      toast.success("Label customization saved! Refresh to see changes.");
      
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

  const handleResetToDefault = async () => {
    if (!selectedLabel) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("labels")
        .update({
          accent_color: "#ef4444",
        })
        .eq("id", selectedLabel.id);

      if (error) throw error;

      setAccentColor("#ef4444");
      toast.success("Accent color reset to default! Refresh to see changes.");
      await fetchLabels();
    } catch (error: any) {
      console.error("Error resetting color:", error);
      toast.error("Failed to reset color");
    } finally {
      setLoading(false);
    }
  };

  // Determine feature access based on plan
  // Only Label Prestige and Partner plans have full customization access
  const planName = userPlan?.plan?.name || "";
  const hasFullAccess = planName === "Label Prestige" || 
                        labelType === "partner_label" || 
                        labelType === "prestige_label";

  const canCustomizeLogo = hasFullAccess;
  const canCustomizeAccentColor = hasFullAccess;
  const canCustomizeBanner = hasFullAccess;

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
          {!hasFullAccess && (
            <Alert className="mt-4 border-muted">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Label customization is only available on Label Prestige and Label Partner plans. Upgrade to customize your label branding.
              </AlertDescription>
            </Alert>
          )}
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
                <Label htmlFor="accentColor" className="flex items-center gap-2">
                  Accent Color
                  {!canCustomizeAccentColor && <Lock className="w-3 h-3 text-muted-foreground" />}
                </Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="accentColor"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-12 w-24 cursor-pointer"
                    disabled={!canCustomizeAccentColor}
                  />
                  <Input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#ef4444"
                    className="flex-1 bg-background/50 border-border"
                    disabled={!canCustomizeAccentColor}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetToDefault}
                    disabled={!canCustomizeAccentColor || loading || accentColor === "#ef4444"}
                  >
                    Reset
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This color will be applied to all buttons, accents, and branding throughout your label's organization. Changes apply after saving and refreshing.
                  {!canCustomizeAccentColor && " (Upgrade to Label Prestige or Partner)"}
                </p>
              </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label htmlFor="logo" className="flex items-center gap-2">
              Label Logo
              {!canCustomizeLogo && <Lock className="w-3 h-3 text-muted-foreground" />}
            </Label>
                {selectedLabel.logo_url && !logoFile && (
                  <div className="mb-3 p-4 border border-border rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-2">Current Logo:</p>
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedLabel.logo_url}
                        alt="Current logo"
                        className="max-h-24 rounded-lg border border-border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const { error } = await supabase
                              .from("labels")
                              .update({ logo_url: null })
                              .eq("id", selectedLabel.id);
                            if (error) throw error;
                            toast.success("Logo removed! Refresh to see changes.");
                            await fetchLabels();
                          } catch (error) {
                            toast.error("Failed to remove logo");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={!canCustomizeLogo || loading}
                      >
                        Remove
                      </Button>
                    </div>
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
                    disabled={!canCustomizeLogo}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const input = document.getElementById("logo") as HTMLInputElement;
                      input?.click();
                    }}
                    disabled={!canCustomizeLogo}
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
                  {!canCustomizeLogo && " (Upgrade to Label Prestige or Partner)"}
                </p>
              </div>

          {/* Dropdown Banner Upload */}
          <div className="space-y-2">
            <Label htmlFor="banner" className="flex items-center gap-2">
              Dropdown Banner
              {!canCustomizeBanner && <Lock className="w-3 h-3 text-muted-foreground" />}
            </Label>
                {banner && !bannerFile && (
                  <div className="mb-3 p-4 border border-border rounded-lg bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-2">Current Banner:</p>
                    <div className="flex flex-col gap-2">
                      <img
                        src={banner.banner_url}
                        alt="Current banner"
                        className="w-full max-h-32 object-cover rounded-lg border border-border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const { error } = await supabase
                              .from("label_dropdown_banners")
                              .delete()
                              .eq("id", banner.id);
                            if (error) throw error;
                            toast.success("Banner removed!");
                            setBanner(null);
                            await fetchLabels();
                          } catch (error) {
                            toast.error("Failed to remove banner");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={!canCustomizeBanner || loading}
                        className="w-fit"
                      >
                        Remove Banner
                      </Button>
                    </div>
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
                    disabled={!canCustomizeBanner}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const input = document.getElementById("banner") as HTMLInputElement;
                      input?.click();
                    }}
                    disabled={!canCustomizeBanner}
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
                  {!canCustomizeBanner && " (Upgrade to Label Prestige or Partner)"}
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
