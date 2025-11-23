import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const AnnouncementBar = () => {
  const [visible, setVisible] = useState(false);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    // Load dismissed announcement ID from localStorage
    const dismissed = localStorage.getItem('dismissedAnnouncementId');
    if (dismissed) {
      setDismissedId(dismissed);
    }
    fetchAnnouncementBar();

    // Subscribe to changes
    const channel = supabase
      .channel('announcement_bar_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcement_bar',
        },
        () => {
          fetchAnnouncementBar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnnouncementBar = async () => {
    try {
      const { data, error } = await supabase
        .from("announcement_bar")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const now = new Date();
        const startDate = data.start_date ? new Date(data.start_date) : null;
        const endDate = data.end_date ? new Date(data.end_date) : null;

        // Check if within date range
        const isWithinDateRange = 
          (!startDate || now >= startDate) &&
          (!endDate || now <= endDate);

        if (isWithinDateRange) {
          setAnnouncement(data);
          // Only show if this announcement hasn't been dismissed
          if (dismissedId !== data.id) {
            setVisible(true);
            setDismissed(false);
          }
        } else {
          setVisible(false);
        }
      } else {
        setVisible(false);
      }
    } catch (error) {
      console.error("Error fetching announcement bar:", error);
    }
  };

  const handleDismiss = () => {
    console.log("Announcement bar dismissed", announcement?.id);
    if (announcement?.id) {
      // Store dismissed announcement ID in localStorage
      localStorage.setItem("dismissedAnnouncementId", announcement.id);
      setDismissedId(announcement.id);
    }
    setIsSliding(true);
    setTimeout(() => {
      setDismissed(true);
      setVisible(false);
      setIsSliding(false);
    }, 300); // Match animation duration
  };

  if (!visible || dismissed || !announcement) {
    return null;
  }

  return (
    <div className={cn(
      "bg-gradient-primary border-b border-primary/20 transition-all duration-300",
      !isSliding && "animate-in slide-in-from-top",
      isSliding && "animate-out slide-out-to-top"
    )}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-white flex-1 break-words">
            {announcement.message}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {announcement.button_text && announcement.button_link && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-black hover:bg-white/90"
                asChild
              >
                <a 
                  href={announcement.button_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {announcement.button_text}
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 h-8 w-8 p-0"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
