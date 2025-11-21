import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Megaphone, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_active: boolean;
}

export const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch announcements");
      return;
    }

    setAnnouncements(data || []);
  };

  const createAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("announcements")
      .insert({
        title: title.trim(),
        message: message.trim(),
        created_by: user?.id,
        is_active: true,
      });

    setLoading(false);

    if (error) {
      toast.error("Failed to create announcement");
      return;
    }

    toast.success("Announcement created successfully");
    setTitle("");
    setMessage("");
    fetchAnnouncements();
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update announcement");
      return;
    }

    toast.success(`Announcement ${!currentStatus ? "activated" : "deactivated"}`);
    fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete announcement");
      return;
    }

    toast.success("Announcement deleted");
    fetchAnnouncements();
  };

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="text-2xl font-title">CREATE ANNOUNCEMENT</CardTitle>
              <CardDescription>Send notifications to all users</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Announcement message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] bg-background border-border"
            />
          </div>
          <Button
            onClick={createAnnouncement}
            disabled={loading}
            className="bg-gradient-primary hover:opacity-90"
          >
            Create Announcement
          </Button>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-title">EXISTING ANNOUNCEMENTS</CardTitle>
          <CardDescription>Manage your announcements</CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No announcements yet
            </p>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 rounded-lg border border-border bg-muted/30 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">
                          {announcement.title}
                        </h3>
                        <Badge variant={announcement.is_active ? "default" : "secondary"}>
                          {announcement.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {announcement.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={() =>
                          toggleActive(announcement.id, announcement.is_active)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAnnouncement(announcement.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
