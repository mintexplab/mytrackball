import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface AnnouncementDialogProps {
  userId: string;
}

export const AnnouncementDialog = ({ userId }: AnnouncementDialogProps) => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchUnviewedAnnouncement();
  }, [userId]);

  const fetchUnviewedAnnouncement = async () => {
    // Get all active announcements
    const { data: announcements } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!announcements || announcements.length === 0) return;

    // Get viewed announcements
    const { data: viewedAnnouncements } = await supabase
      .from("user_announcement_views")
      .select("announcement_id")
      .eq("user_id", userId);

    const viewedIds = viewedAnnouncements?.map(v => v.announcement_id) || [];

    // Find first unviewed announcement
    const unviewed = announcements.find(a => !viewedIds.includes(a.id));

    if (unviewed) {
      setAnnouncement(unviewed);
      setOpen(true);
    }
  };

  const markAsViewed = async () => {
    if (!announcement) return;

    await supabase
      .from("user_announcement_views")
      .insert({
        user_id: userId,
        announcement_id: announcement.id,
      });

    setOpen(false);
    setAnnouncement(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-title">
            {announcement?.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {announcement?.created_at && new Date(announcement.created_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-foreground">
              {announcement?.message}
            </p>
          </div>
        </ScrollArea>
        <div className="flex justify-end">
          <Button onClick={markAsViewed} className="bg-gradient-primary">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
