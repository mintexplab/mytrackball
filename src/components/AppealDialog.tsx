import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface AppealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userName: string;
}

export const AppealDialog = ({ open, onOpenChange, userId, userEmail, userName }: AppealDialogProps) => {
  const [appealReason, setAppealReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!appealReason.trim()) {
      toast.error("Please explain your appeal");
      return;
    }

    setLoading(true);

    try {
      // Create appeal
      const { error: appealError } = await supabase
        .from("account_appeals")
        .insert({
          user_id: userId,
          user_email: userEmail,
          user_name: userName,
          appeal_reason: appealReason,
        });

      if (appealError) throw appealError;

      // Send notification email to admin
      const { error: emailError } = await supabase.functions.invoke('send-appeal-notification', {
        body: {
          userEmail,
          userName,
          appealReason,
        },
      });

      if (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't throw error, appeal is still created
      }

      toast.success("Appeal submitted successfully! We'll review your case and contact you via email.");
      setAppealReason("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting appeal:", error);
      toast.error("Failed to submit appeal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Appeal Account Termination</DialogTitle>
          <DialogDescription>
            Please explain why you believe your account should be reinstated. Be detailed and honest in your explanation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Explain your case here... (minimum 50 characters)"
            value={appealReason}
            onChange={(e) => setAppealReason(e.target.value)}
            className="min-h-[200px] bg-background/50 border-border"
            minLength={50}
          />
          <p className="text-xs text-muted-foreground">
            {appealReason.length} / 50 minimum characters
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || appealReason.length < 50}
            className="w-full sm:w-auto bg-gradient-primary hover:opacity-90"
          >
            <Send className="w-4 h-4 mr-2" />
            {loading ? "Submitting..." : "Submit Appeal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
