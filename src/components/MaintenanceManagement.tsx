import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const MaintenanceManagement = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    isActive: false,
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    reason: "",
  });

  useEffect(() => {
    fetchMaintenanceSettings();
  }, []);

  const fetchMaintenanceSettings = async () => {
    const { data } = await supabase
      .from("maintenance_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setSettings(data);
      const startDate = new Date(data.start_time);
      const endDate = new Date(data.end_time);
      
      setFormData({
        isActive: data.is_active,
        startDate: format(startDate, "yyyy-MM-dd"),
        startTime: format(startDate, "HH:mm"),
        endDate: format(endDate, "yyyy-MM-dd"),
        endTime: format(endDate, "HH:mm"),
        reason: data.reason,
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime || !formData.reason) {
        toast.error("Please fill in all fields");
        return;
      }

      const startTime = new Date(`${formData.startDate}T${formData.startTime}`).toISOString();
      const endTime = new Date(`${formData.endDate}T${formData.endTime}`).toISOString();

      const { data: { user } } = await supabase.auth.getUser();

      if (settings) {
        // Update existing
        const { error } = await supabase
          .from("maintenance_settings")
          .update({
            is_active: formData.isActive,
            start_time: startTime,
            end_time: endTime,
            reason: formData.reason,
            updated_by: user?.id,
          })
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("maintenance_settings")
          .insert({
            is_active: formData.isActive,
            start_time: startTime,
            end_time: endTime,
            reason: formData.reason,
            updated_by: user?.id,
          });

        if (error) throw error;
      }

      toast.success(formData.isActive ? "Maintenance mode activated" : "Maintenance settings saved");
      fetchMaintenanceSettings();
    } catch (error: any) {
      console.error("Error saving maintenance settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (!settings) {
      toast.error("Please save maintenance settings first");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("maintenance_settings")
        .update({
          is_active: checked,
          updated_by: user?.id,
        })
        .eq("id", settings.id);

      if (error) throw error;

      setFormData({ ...formData, isActive: checked });
      toast.success(checked ? "Maintenance mode activated" : "Maintenance mode deactivated");
      fetchMaintenanceSettings();
    } catch (error: any) {
      console.error("Error toggling maintenance mode:", error);
      toast.error("Failed to toggle maintenance mode");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-primary" />
          <div>
            <CardTitle className="text-2xl font-bold">Maintenance Mode</CardTitle>
            <CardDescription>Configure system-wide maintenance lockouts</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
          <div>
            <Label className="text-base font-semibold">Maintenance Mode Status</Label>
            <p className="text-sm text-muted-foreground">
              {formData.isActive ? "Active - Users will see maintenance notice" : "Inactive - Normal operation"}
            </p>
          </div>
          <Switch
            checked={formData.isActive}
            onCheckedChange={handleToggle}
            disabled={loading || !settings}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="bg-background/50 border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="bg-background/50 border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="bg-background/50 border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="bg-background/50 border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Maintenance Reason</Label>
          <Textarea
            id="reason"
            placeholder="e.g., System updates, Database migration, Feature deployment"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            className="bg-background/50 border-border min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground">This will be displayed to users during maintenance</p>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
        >
          {loading ? "Saving..." : "Save Maintenance Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MaintenanceManagement;
