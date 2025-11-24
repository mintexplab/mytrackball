import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2, Image as ImageIcon, Palette } from "lucide-react";
import { useS3Upload } from "@/hooks/useS3Upload";

export const SubdistributorCustomization = () => {
  const [loading, setLoading] = useState(false);
  const [dashboardName, setDashboardName] = useState("My Trackball");
  const [footerText, setFooterText] = useState("© 2025 My Trackball. All rights reserved.");
  const [accentColor, setAccentColor] = useState("#ef4444");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const { uploadFile, uploading } = useS3Upload();

  useEffect(() => {
    fetchCustomization();
  }, []);

  const fetchCustomization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("subdistributor_dashboard_name, subdistributor_footer_text, subdistributor_logo_url, subdistributor_accent_color, is_subdistributor_master")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data && data.is_subdistributor_master) {
        setDashboardName(data.subdistributor_dashboard_name || "My Trackball");
        setFooterText(data.subdistributor_footer_text || "© 2025 My Trackball. All rights reserved.");
        setAccentColor(data.subdistributor_accent_color || "#ef4444");
        setCurrentLogoUrl(data.subdistributor_logo_url);
      }
    } catch (error: any) {
      console.error("Error fetching customization:", error);
      toast.error("Failed to load customization");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload logo if selected
      let logoUrl = currentLogoUrl;
      if (logoFile) {
        const uploadedLogoUrl = await uploadFile({
          file: logoFile,
          path: `${user.id}/subdistributor-logos/${Date.now()}-${logoFile.name}`,
        });
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          subdistributor_dashboard_name: dashboardName.trim() || "My Trackball",
          subdistributor_footer_text: footerText.trim() || "© 2025 My Trackball. All rights reserved.",
          subdistributor_logo_url: logoUrl,
          subdistributor_accent_color: accentColor,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Customization saved! Refresh to see changes.");
      setLogoFile(null);
      await fetchCustomization();
    } catch (error: any) {
      console.error("Error saving customization:", error);
      toast.error(error.message || "Failed to save customization");
    } finally {
      setLoading(false);
    }
  };

  const handleResetLogo = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ subdistributor_logo_url: null })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Logo removed! Refresh to see changes.");
      setCurrentLogoUrl(null);
      await fetchCustomization();
    } catch (error) {
      toast.error("Failed to remove logo");
    } finally {
      setLoading(false);
    }
  };

  const handleResetColor = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ subdistributor_accent_color: "#ef4444" })
        .eq("id", user.id);

      if (error) throw error;

      setAccentColor("#ef4444");
      toast.success("Accent color reset! Refresh to see changes.");
      await fetchCustomization();
    } catch (error) {
      toast.error("Failed to reset color");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          Platform Customization
        </CardTitle>
        <CardDescription>
          Customize your distribution platform's branding. Changes apply to your entire organization (all your subaccounts).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dashboard Name */}
        <div className="space-y-2">
          <Label htmlFor="dashboardName">Dashboard Name</Label>
          <Input
            id="dashboardName"
            type="text"
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            placeholder="My Trackball"
            maxLength={50}
            className="bg-background/50 border-border"
          />
          <p className="text-xs text-muted-foreground">
            This name will appear in the dashboard header for your entire organization
          </p>
        </div>

        {/* Footer Text */}
        <div className="space-y-2">
          <Label htmlFor="footerText">Footer Text</Label>
          <Input
            id="footerText"
            type="text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="© 2025 My Trackball. All rights reserved."
            maxLength={100}
            className="bg-background/50 border-border"
          />
          <p className="text-xs text-muted-foreground">
            This text will appear in the footer across your organization's platform
          </p>
        </div>

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
            <Button
              type="button"
              variant="outline"
              onClick={handleResetColor}
              disabled={loading || accentColor === "#ef4444"}
            >
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This color will be applied throughout your organization's platform
          </p>
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <Label htmlFor="logo">Platform Logo</Label>
          {currentLogoUrl && !logoFile && (
            <div className="mb-3 p-4 border border-border rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground mb-2">Current Logo:</p>
              <div className="flex items-center gap-3">
                <img
                  src={currentLogoUrl}
                  alt="Current logo"
                  className="max-h-24 rounded-lg border border-border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetLogo}
                  disabled={loading}
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
            Upload a logo for your dashboard header (recommended: 256x256px, max 5MB)
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
      </CardContent>
    </Card>
  );
};
