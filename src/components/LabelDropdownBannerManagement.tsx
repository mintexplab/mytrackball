import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { useS3Upload } from "@/hooks/useS3Upload";
import dropdownBanner from "@/assets/dropdown-banner.png";

export const LabelDropdownBannerManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<string | null>(null);
  const [labelId, setLabelId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const { uploadFile, uploading } = useS3Upload();

  useEffect(() => {
    fetchBannerData();
  }, []);

  const fetchBannerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("active_label_id, label_type")
        .eq("id", user.id)
        .single();

      if (!profile?.active_label_id) {
        setLoading(false);
        return;
      }

      // Check if user has eligible label type
      const eligibleTypes = ['Label Partner', 'Label Signature', 'Label Prestige'];
      const isEligible = eligibleTypes.includes(profile.label_type || '');
      setCanManage(isEligible);

      if (!isEligible) {
        setLoading(false);
        return;
      }

      setLabelId(profile.active_label_id);

      // Fetch existing banner
      const { data: banner } = await supabase
        .from("label_dropdown_banners")
        .select("banner_url")
        .eq("label_id", profile.active_label_id)
        .maybeSingle();

      if (banner) {
        setCurrentBanner(banner.banner_url);
      }
    } catch (error) {
      console.error("Error fetching banner data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !labelId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    try {
      setSaving(true);

      // Get user first for path validation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload to S3 with user ID prefix for security
      const path = `${user.id}/label-banners/${Date.now()}-${file.name}`;
      const uploadedUrl = await uploadFile({ file, path, oldPath: currentBanner || undefined });

      if (!uploadedUrl) {
        throw new Error("Upload failed");
      }

      const { error } = await supabase
        .from("label_dropdown_banners")
        .upsert({
          label_id: labelId,
          banner_url: uploadedUrl,
          created_by: user.id
        }, {
          onConflict: 'label_id'
        });

      if (error) throw error;

      setCurrentBanner(uploadedUrl);
      toast.success("Banner updated successfully");
    } catch (error: any) {
      console.error("Error uploading banner:", error);
      toast.error(error.message || "Failed to upload banner");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Dropdown Banner</CardTitle>
          <CardDescription>
            This feature is only available for Label Partner, Label Signature, and Label Prestige accounts.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Dropdown Banner</CardTitle>
        <CardDescription>
          Customize the banner image shown in the profile dropdown for all members of your label.
          Recommended size: 1024x256px
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Current Banner Preview</Label>
          <div className="w-full max-w-md h-32 overflow-hidden rounded-md border border-border">
            <img 
              src={currentBanner || dropdownBanner} 
              alt="Dropdown Banner Preview" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="banner-upload">Upload New Banner</Label>
          <div className="flex gap-2">
            <Input
              id="banner-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading || saving}
            />
            <Button
              variant="outline"
              disabled={uploading || saving}
              onClick={() => document.getElementById('banner-upload')?.click()}
            >
              {uploading || saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supported formats: JPG, PNG, WebP. Maximum size: 5MB
          </p>
        </div>

        {currentBanner && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              This custom banner will be displayed for all master and subaccounts under your label.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};