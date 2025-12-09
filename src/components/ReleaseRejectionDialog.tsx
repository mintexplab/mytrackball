import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReleaseRejectionDialogProps {
  releaseId: string;
  currentStatus: string;
  onUpdate: () => void;
  asMenuItem?: boolean;
}

const ReleaseRejectionDialog = ({ releaseId, currentStatus, onUpdate, asMenuItem }: ReleaseRejectionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("releases")
      .update({ 
        status: "rejected",
        rejection_reason: reason 
      })
      .eq("id", releaseId);

    if (error) {
      toast.error("Failed to reject release");
    } else {
      toast.success("Release rejected");
      setOpen(false);
      setReason("");
      onUpdate();
    }
    setLoading(false);
  };

  const TriggerContent = asMenuItem ? (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        setOpen(true);
      }}
      disabled={currentStatus === "rejected"}
      className="text-red-400"
    >
      <XCircle className="w-3 h-3 mr-2" />
      Reject
    </DropdownMenuItem>
  ) : (
    <Button
      size="sm"
      variant="outline"
      disabled={currentStatus === "rejected"}
      className="border-red-500/30 hover:bg-red-500/20 text-red-300"
    >
      <XCircle className="w-4 h-4 mr-2" />
      Reject
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {TriggerContent}
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-bold">Reject Release</DialogTitle>
          <DialogDescription>Provide a reason for rejecting this release</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Rejection Reason</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this release is being rejected..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="bg-background border-border"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600"
            >
              {loading ? "Rejecting..." : "Reject Release"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReleaseRejectionDialog;
