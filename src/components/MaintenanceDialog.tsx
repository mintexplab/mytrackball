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
import { AlertTriangle, Mail, LogOut } from "lucide-react";
import { format } from "date-fns";

interface MaintenanceDialogProps {
  userId: string;
  onSignOut: () => void;
}

export const MaintenanceDialog = ({ userId, onSignOut }: MaintenanceDialogProps) => {
  const [maintenanceSettings, setMaintenanceSettings] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    checkMaintenanceMode();

    // Set up real-time subscription for maintenance mode changes
    const channel = supabase
      .channel('maintenance_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_settings'
        },
        () => {
          checkMaintenanceMode();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const checkMaintenanceMode = async () => {
    const { data } = await supabase
      .from("maintenance_settings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setMaintenanceSettings(data);
      setShowDialog(true);
    } else {
      setShowDialog(false);
    }
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:contact@trackball.cc?subject=Maintenance Support Request";
  };

  if (!maintenanceSettings) return null;

  const startTime = new Date(maintenanceSettings.start_time);
  const endTime = new Date(maintenanceSettings.end_time);

  return (
    <AlertDialog open={showDialog} onOpenChange={() => {}}>
      <AlertDialogContent 
        className="bg-card border-primary/30 max-w-md" 
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-2xl">
            My Trackball is currently under maintenance
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-4 pt-4">
            <div className="text-base">
              <p className="font-semibold text-foreground mb-2">Maintenance Window:</p>
              <p className="text-muted-foreground">
                {format(startTime, "MM/dd/yyyy")} at {format(startTime, "HH:mm")}
              </p>
              <p className="text-muted-foreground mb-3">to</p>
              <p className="text-muted-foreground">
                {format(endTime, "MM/dd/yyyy")} at {format(endTime, "HH:mm")}
              </p>
            </div>
            
            {maintenanceSettings.reason && (
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="font-semibold text-foreground mb-2">Reason:</p>
                <p className="text-sm text-muted-foreground">{maintenanceSettings.reason}</p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              If you need any assistance, contact support by clicking the button below.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2">
          <Button
            onClick={handleContactSupport}
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
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
  );
};
