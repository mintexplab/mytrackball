import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { XCircle, Mail, LogOut, FileText } from "lucide-react";
import { AppealDialog } from "./AppealDialog";
import { playErrorSound } from "@/hooks/useErrorSound";

interface TerminatedAccountDialogProps {
  userId: string;
  onSignOut: () => void;
}

export const TerminatedAccountDialog = ({ userId, onSignOut }: TerminatedAccountDialogProps) => {
  const [isTerminated, setIsTerminated] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showAppealDialog, setShowAppealDialog] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [hasAppeal, setHasAppeal] = useState(false);
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    checkTerminationStatus();
    fetchUserInfo();

    // Set up real-time subscription for profile changes
    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        () => {
          checkTerminationStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchUserInfo = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("email, full_name, display_name, ban_reason")
      .eq("id", userId)
      .single();

    if (data) {
      setUserEmail(data.email);
      setUserName(data.display_name || data.full_name || "User");
      setBanReason(data.ban_reason || "");
    }

    // Check if user already has a pending appeal
    const { data: appealData } = await supabase
      .from("account_appeals")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();

    setHasAppeal(!!appealData);
  };

  const checkTerminationStatus = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("id", userId)
      .single();

    if (data?.is_banned) {
      setIsTerminated(true);
      setShowDialog(true);
      playErrorSound(); // Play error sound when account is terminated
    } else {
      setIsTerminated(false);
      setShowDialog(false);
    }
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:contact@trackball.cc?subject=Account Termination Inquiry";
  };

  if (!isTerminated) return null;

  return (
    <>
      <AlertDialog open={showDialog} onOpenChange={() => {}}>
        <AlertDialogContent 
          className="bg-card border-destructive/50 max-w-md w-full" 
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl text-destructive">
              Your Trackball Distribution account has been terminated
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4 pt-4">
              {banReason && (
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                  <p className="text-sm font-medium text-foreground mb-2">Reason for termination:</p>
                  <p className="text-sm text-foreground break-words">{banReason}</p>
                </div>
              )}

              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                <ul className="text-sm text-foreground space-y-2 text-left list-disc list-inside break-words">
                  <li>You will not receive any of your existing royalties</li>
                  <li>All of your releases have been scheduled for takedown from DSPs</li>
                  <li>If you purchased a subscription plan, it will be cancelled and you will not be refunded</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                If you believe this is an error or need assistance, please contact support or submit an appeal.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col w-full">
            {!hasAppeal && (
              <Button
                onClick={() => setShowAppealDialog(true)}
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <FileText className="w-4 h-4 mr-2" />
                Submit Appeal
              </Button>
            )}
            {hasAppeal && (
              <div className="w-full p-3 bg-muted/50 rounded-lg border border-border text-center">
                <p className="text-sm text-muted-foreground">Your appeal is pending review</p>
              </div>
            )}
            <Button
              onClick={handleContactSupport}
              variant="outline"
              className="w-full border-border hover:bg-muted"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
            <Button
              onClick={onSignOut}
              variant="outline"
              className="w-full border-border hover:bg-muted"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppealDialog
        open={showAppealDialog}
        onOpenChange={(open) => {
          setShowAppealDialog(open);
          if (!open) {
            fetchUserInfo(); // Refresh appeal status
          }
        }}
        userId={userId}
        userEmail={userEmail}
        userName={userName}
      />
    </>
  );
};
