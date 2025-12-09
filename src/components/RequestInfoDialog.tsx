import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RequestInfoDialogProps {
  releaseId: string;
  releaseTitle: string;
  artistName: string;
  userEmail: string;
  userName: string;
  asMenuItem?: boolean;
}

const RequestInfoDialog = ({ 
  releaseId, 
  releaseTitle, 
  artistName, 
  userEmail, 
  userName,
  asMenuItem 
}: RequestInfoDialogProps) => {
  const [open, setOpen] = useState(false);
  const [requiredInfo, setRequiredInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!requiredInfo.trim()) {
      toast.error("Please specify what information is needed");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-info-request", {
        body: {
          releaseId,
          releaseTitle,
          artistName,
          userEmail,
          userName,
          requiredInfo: requiredInfo.trim()
        }
      });

      if (error) throw error;

      toast.success("Information request sent to user");
      setOpen(false);
      setRequiredInfo("");
    } catch (error: any) {
      console.error("Error sending info request:", error);
      toast.error("Failed to send information request");
    } finally {
      setLoading(false);
    }
  };

  const TriggerContent = asMenuItem ? (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        setOpen(true);
      }}
    >
      <MessageSquare className="w-3 h-3 mr-2" />
      Request Information
    </DropdownMenuItem>
  ) : (
    <Button
      size="sm"
      variant="outline"
      onClick={() => setOpen(true)}
    >
      <MessageSquare className="w-4 h-4 mr-2" />
      Request Info
    </Button>
  );

  return (
    <>
      {asMenuItem ? TriggerContent : (
        <Dialog open={open} onOpenChange={setOpen}>
          {TriggerContent}
        </Dialog>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Request Information
            </DialogTitle>
            <DialogDescription>
              Send a request to {userName || userEmail} for more information about "{releaseTitle}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="p-3 rounded-lg bg-muted/30 text-sm">
              <p className="text-muted-foreground">
                An email will be sent to <strong>{userEmail}</strong> with the following message:
              </p>
              <p className="mt-2 italic text-muted-foreground">
                "Hey! We need more information for this release. What we need from you is listed below. Please fill in the required information."
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="requiredInfo">What information do you need?</Label>
              <Textarea
                id="requiredInfo"
                placeholder="e.g., Please provide:
- Higher quality artwork (at least 3000x3000px)
- Correct spelling of featured artist name
- Publisher IPI number for track 3"
                value={requiredInfo}
                onChange={(e) => setRequiredInfo(e.target.value)}
                rows={6}
                className="bg-background border-border"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={loading || !requiredInfo.trim()}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Request"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestInfoDialog;
