import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MaintenanceManagement = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [securitySettings, setSecuritySettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    isActive: false,
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    reason: "",
  });
  const [securityFormData, setSecurityFormData] = useState({
    isActive: false,
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    reason: "Security Issue - Under Investigation",
  });

  useEffect(() => {
    fetchMaintenanceSettings();
  }, []);

  const fetchMaintenanceSettings = async () => {
    // Fetch regular maintenance
    const { data: regularData } = await supabase
      .from("maintenance_settings")
      .select("*")
      .eq("maintenance_type", "regular")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (regularData) {
      setSettings(regularData);
      const startDate = new Date(regularData.start_time);
      const endDate = new Date(regularData.end_time);
      
      setFormData({
        isActive: regularData.is_active,
        startDate: format(startDate, "yyyy-MM-dd"),
        startTime: format(startDate, "HH:mm"),
        endDate: format(endDate, "yyyy-MM-dd"),
        endTime: format(endDate, "HH:mm"),
        reason: regularData.reason,
      });
    }

    // Fetch security maintenance
    const { data: securityData } = await supabase
      .from("maintenance_settings")
      .select("*")
      .eq("maintenance_type", "security")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (securityData) {
      setSecuritySettings(securityData);
      const startDate = new Date(securityData.start_time);
      const endDate = new Date(securityData.end_time);
      
      setSecurityFormData({
        isActive: securityData.is_active,
        startDate: format(startDate, "yyyy-MM-dd"),
        startTime: format(startDate, "HH:mm"),
        endDate: format(endDate, "yyyy-MM-dd"),
        endTime: format(endDate, "HH:mm"),
        reason: securityData.reason,
      });
    }
  };

  const handleSave = async (type: 'regular' | 'security') => {
    setLoading(true);

    try {
      const data = type === 'regular' ? formData : securityFormData;
      const existingSettings = type === 'regular' ? settings : securitySettings;

      if (!data.startDate || !data.startTime || !data.endDate || !data.endTime || !data.reason) {
        toast.error("Please fill in all fields");
        return;
      }

      const startTime = new Date(`${data.startDate}T${data.startTime}`).toISOString();
      const endTime = new Date(`${data.endDate}T${data.endTime}`).toISOString();

      const { data: { user } } = await supabase.auth.getUser();

      if (existingSettings) {
        // Update existing
        const { error } = await supabase
          .from("maintenance_settings")
          .update({
            is_active: data.isActive,
            start_time: startTime,
            end_time: endTime,
            reason: data.reason,
            updated_by: user?.id,
          })
          .eq("id", existingSettings.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("maintenance_settings")
          .insert({
            is_active: data.isActive,
            start_time: startTime,
            end_time: endTime,
            reason: data.reason,
            updated_by: user?.id,
            maintenance_type: type,
          });

        if (error) throw error;
      }

      toast.success(data.isActive ? `${type === 'security' ? 'Security' : 'Maintenance'} mode activated` : `${type === 'security' ? 'Security' : 'Maintenance'} settings saved`);
      fetchMaintenanceSettings();
    } catch (error: any) {
      console.error("Error saving maintenance settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean, type: 'regular' | 'security') => {
    const existingSettings = type === 'regular' ? settings : securitySettings;
    
    if (!existingSettings) {
      toast.error("Please save maintenance settings first");
      return;
    }

    // If deactivating security mode, send unlock emails
    if (type === 'security' && !checked && existingSettings.is_active) {
      try {
        await supabase.functions.invoke('send-security-unlock-notification');
        toast.success("Security unlock notification emails sent to all users");
      } catch (error) {
        console.error("Error sending unlock emails:", error);
        toast.error("Failed to send unlock emails");
      }
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
        .eq("id", existingSettings.id);

      if (error) throw error;

      if (type === 'regular') {
        setFormData({ ...formData, isActive: checked });
      } else {
        setSecurityFormData({ ...securityFormData, isActive: checked });
      }
      
      toast.success(checked ? `${type === 'security' ? 'Security' : 'Maintenance'} mode activated` : `${type === 'security' ? 'Security' : 'Maintenance'} mode deactivated`);
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
            <CardDescription>Configure system-wide maintenance and security lockouts</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="regular" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="regular">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Regular Maintenance
            </TabsTrigger>
            <TabsTrigger value="security">
              <ShieldAlert className="w-4 h-4 mr-2" />
              Security Lock
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regular" className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
              <div>
                <Label className="text-base font-semibold">Maintenance Mode Status</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.isActive ? "Active - Users will see maintenance notice" : "Inactive - Normal operation"}
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => handleToggle(checked, 'regular')}
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
              onClick={() => handleSave('regular')}
              disabled={loading}
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              {loading ? "Saving..." : "Save Maintenance Settings"}
            </Button>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/30">
              <div>
                <Label className="text-base font-semibold">Security Lock Status</Label>
                <p className="text-sm text-muted-foreground">
                  {securityFormData.isActive ? "Active - Platform locked for all users" : "Inactive - Normal operation"}
                </p>
              </div>
              <Switch
                checked={securityFormData.isActive}
                onCheckedChange={(checked) => handleToggle(checked, 'security')}
                disabled={loading || !securitySettings}
              />
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                When security lock is disabled, all users will receive an email notification that Trackball Distribution is unlocked.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="secStartDate">Start Date</Label>
                <Input
                  id="secStartDate"
                  type="date"
                  value={securityFormData.startDate}
                  onChange={(e) => setSecurityFormData({ ...securityFormData, startDate: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secStartTime">Start Time</Label>
                <Input
                  id="secStartTime"
                  type="time"
                  value={securityFormData.startTime}
                  onChange={(e) => setSecurityFormData({ ...securityFormData, startTime: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="secEndDate">End Date</Label>
                <Input
                  id="secEndDate"
                  type="date"
                  value={securityFormData.endDate}
                  onChange={(e) => setSecurityFormData({ ...securityFormData, endDate: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secEndTime">End Time</Label>
                <Input
                  id="secEndTime"
                  type="time"
                  value={securityFormData.endTime}
                  onChange={(e) => setSecurityFormData({ ...securityFormData, endTime: e.target.value })}
                  className="bg-background/50 border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secReason">Internal Notes</Label>
              <Textarea
                id="secReason"
                placeholder="Internal notes about the security issue (not shown to users)"
                value={securityFormData.reason}
                onChange={(e) => setSecurityFormData({ ...securityFormData, reason: e.target.value })}
                className="bg-background/50 border-border min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">These notes are for internal reference only</p>
            </div>

            <Button
              onClick={() => handleSave('security')}
              disabled={loading}
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              {loading ? "Saving..." : "Save Security Lock Settings"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MaintenanceManagement;