import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const VersionManagement = () => {
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVersion();
  }, []);

  const fetchVersion = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "version")
        .single();

      if (error) throw error;
      if (data) setVersion(data.setting_value);
    } catch (error: any) {
      console.error("Error fetching version:", error);
      toast({
        title: "Error",
        description: "Failed to load version number",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVersion = async () => {
    if (!version.trim()) {
      toast({
        title: "Invalid Version",
        description: "Version text cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ setting_value: version })
        .eq("setting_key", "version");

      if (error) throw error;

      toast({
        title: "Success",
        description: "Version number updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating version:", error);
      toast({
        title: "Error",
        description: "Failed to update version number",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version Management</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Version Management</CardTitle>
        <CardDescription>
          Update the app version text displayed in the footer (any text is allowed)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Version Number</label>
          <Input
            type="text"
            placeholder="1.16.0"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This text will be shown as the version label in the footer.
          </p>
        </div>
        <Button onClick={handleUpdateVersion} disabled={updating}>
          {updating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Version"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default VersionManagement;
