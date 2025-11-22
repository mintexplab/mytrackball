import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Megaphone, Save } from "lucide-react";
import { z } from "zod";

const announcementBarSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(500),
  button_text: z.string().trim().max(50).optional(),
  button_link: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
});

export const AnnouncementBarManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [barId, setBarId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    fetchAnnouncementBar();
  }, []);

  const fetchAnnouncementBar = async () => {
    try {
      const { data, error } = await supabase
        .from("announcement_bar")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBarId(data.id);
        setMessage(data.message || "");
        setButtonText(data.button_text || "");
        setButtonLink(data.button_link || "");
        setStartDate(data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : "");
        setEndDate(data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : "");
        setIsActive(data.is_active || false);
      }
    } catch (error) {
      console.error("Error fetching announcement bar:", error);
      toast.error("Failed to load announcement bar");
    } finally {
      setLoading(false);
    }
  };

  const saveAnnouncementBar = async () => {
    try {
      const validatedData = announcementBarSchema.parse({
        message,
        button_text: buttonText || undefined,
        button_link: buttonLink || undefined,
      });

      setSaving(true);

      const barData = {
        message: validatedData.message,
        button_text: validatedData.button_text || null,
        button_link: validatedData.button_link || null,
        start_date: startDate || null,
        end_date: endDate || null,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (barId) {
        // Update existing
        const { error } = await supabase
          .from("announcement_bar")
          .update(barData)
          .eq("id", barId);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("announcement_bar")
          .insert([barData])
          .select()
          .single();

        if (error) throw error;
        setBarId(data.id);
      }

      toast.success("Announcement bar saved successfully");
      fetchAnnouncementBar();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error saving announcement bar:", error);
        toast.error("Failed to save announcement bar");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6" />
          ANNOUNCEMENT BAR
        </CardTitle>
        <CardDescription>
          Configure a site-wide announcement bar that appears at the top of all user dashboards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <Label className="text-base font-medium">Announcement Bar Status</Label>
            <p className="text-sm text-muted-foreground">
              {isActive ? "Currently visible to all users" : "Currently hidden from users"}
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            className="data-[state=checked]:bg-gradient-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message *</Label>
          <Textarea
            id="message"
            placeholder="Important announcement message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-background border-border min-h-[100px]"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {message.length}/500 characters
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="button_text">Button Text (Optional)</Label>
            <Input
              id="button_text"
              placeholder="Learn More"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              className="bg-background border-border"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="button_link">Button Link (Optional)</Label>
            <Input
              id="button_link"
              type="url"
              placeholder="https://example.com"
              value={buttonLink}
              onChange={(e) => setButtonLink(e.target.value)}
              className="bg-background border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date (Optional)</Label>
            <Input
              id="start_date"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Bar will appear starting from this date
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">End Date (Optional)</Label>
            <Input
              id="end_date"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Bar will automatically hide after this date
            </p>
          </div>
        </div>

        {isActive && message && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium mb-2">Preview:</p>
            <div className="bg-gradient-primary p-3 rounded-lg flex items-center justify-between gap-4">
              <p className="text-sm text-white flex-1">{message}</p>
              {buttonText && buttonLink && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white text-black hover:bg-white/90 shrink-0"
                  asChild
                >
                  <a href={buttonLink} target="_blank" rel="noopener noreferrer">
                    {buttonText}
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={saveAnnouncementBar}
          disabled={saving || !message}
          className="w-full bg-gradient-primary hover:opacity-90"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Announcement Bar
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
