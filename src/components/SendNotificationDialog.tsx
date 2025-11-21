import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface SendNotificationDialogProps {
  userId: string;
  userName: string;
}

const SendNotificationDialog = ({ userId, userName }: SendNotificationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);

    const { error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title: title.trim(),
        message: message.trim(),
        type: "system",
      });

    setSending(false);

    if (error) {
      toast.error("Failed to send notification");
      return;
    }

    toast.success("Notification sent successfully");
    setOpen(false);
    setTitle("");
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Send className="w-4 h-4" />
          Send Notification
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-bold">Send Notification</DialogTitle>
          <DialogDescription>Send a personal notification to {userName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Notification title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Your message to the user..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="bg-background border-border"
            />
          </div>
          <Button 
            onClick={sendNotification} 
            disabled={sending}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {sending ? "Sending..." : "Send Notification"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendNotificationDialog;
