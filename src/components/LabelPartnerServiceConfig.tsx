import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Settings, Save, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_SERVICES = [
  { id: "catalog", label: "Catalog Management", description: "View and manage releases" },
  { id: "publishing", label: "Publishing", description: "Submit and manage publishing rights" },
  { id: "royalties", label: "Royalties", description: "View royalty statements" },
  { id: "support", label: "Support Tickets", description: "Create and manage support tickets" },
  { id: "users", label: "User Management", description: "Add and manage team members" },
  { id: "labels", label: "Label Management", description: "Create and customize labels" },
];

export const LabelPartnerServiceConfig = () => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Fetch partner labels (sublabels/subaccounts)
  const { data: partnerLabels } = useQuery({
    queryKey: ["partnerLabels"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get subaccounts (users who have this user as parent)
      const { data: subaccounts } = await supabase
        .from("profiles")
        .select("id, email, display_name, full_name, label_name")
        .eq("parent_account_id", user.id);

      return subaccounts || [];
    },
  });

  // Fetch permissions for each partner label
  const { data: partnerPermissions, isLoading } = useQuery({
    queryKey: ["partnerPermissions"],
    queryFn: async () => {
      if (!partnerLabels || partnerLabels.length === 0) return {};

      const permissionsMap: Record<string, string[]> = {};

      for (const partner of partnerLabels) {
        const { data: perms } = await supabase
          .from("user_permissions")
          .select("permission")
          .eq("user_id", partner.id);

        permissionsMap[partner.id] = perms?.map(p => p.permission) || [];
      }

      return permissionsMap;
    },
    enabled: !!partnerLabels && partnerLabels.length > 0,
  });

  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});

  // Initialize selected permissions when data loads
  useEffect(() => {
    if (partnerPermissions) {
      setSelectedPermissions(partnerPermissions);
    }
  }, [partnerPermissions]);

  const handleTogglePermission = (partnerId: string, serviceId: string) => {
    setSelectedPermissions(prev => {
      const current = prev[partnerId] || [];
      const updated = current.includes(serviceId)
        ? current.filter(s => s !== serviceId)
        : [...current, serviceId];
      return { ...prev, [partnerId]: updated };
    });
  };

  const handleSavePermissions = async (partnerId: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newPermissions = selectedPermissions[partnerId] || [];

      // Delete existing permissions
      await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", partnerId)
        .eq("granted_by", user.id);

      // Insert new permissions
      if (newPermissions.length > 0) {
        const permissionsToInsert = newPermissions.map(permission => ({
          user_id: partnerId,
          permission,
          granted_by: user.id,
        }));

        await supabase
          .from("user_permissions")
          .insert(permissionsToInsert);
      }

      toast.success("Service access updated successfully");
      queryClient.invalidateQueries({ queryKey: ["partnerPermissions"] });
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Failed to update service access");
    } finally {
      setSaving(false);
    }
  };

  if (!partnerLabels || partnerLabels.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Partner Label Service Configuration
          </CardTitle>
          <CardDescription>
            Configure which services your partner labels can access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No partner labels found</p>
            <p className="text-xs mt-1">Invite partner labels to configure their service access</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Partner Label Service Configuration
        </CardTitle>
        <CardDescription>
          Configure which services each of your partner labels can access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {partnerLabels.map((partner) => {
          const currentPermissions = selectedPermissions[partner.id] || partnerPermissions?.[partner.id] || [];
          const hasChanges = JSON.stringify(currentPermissions.sort()) !== 
                            JSON.stringify((partnerPermissions?.[partner.id] || []).sort());

          return (
            <div key={partner.id} className="border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">
                    {partner.label_name || partner.display_name || partner.full_name || partner.email}
                  </h4>
                  <p className="text-xs text-muted-foreground">{partner.email}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {currentPermissions.length} service{currentPermissions.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="grid gap-3">
                {AVAILABLE_SERVICES.map((service) => (
                  <div key={service.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`${partner.id}-${service.id}`}
                      checked={currentPermissions.includes(service.id)}
                      onCheckedChange={() => handleTogglePermission(partner.id, service.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={`${partner.id}-${service.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {service.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {service.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {hasChanges && (
                <Button
                  onClick={() => handleSavePermissions(partner.id)}
                  disabled={saving}
                  className="w-full"
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
