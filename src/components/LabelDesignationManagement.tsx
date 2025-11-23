import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  label_name: string | null;
  label_type: string | null;
  parent_account_id: string | null;
}

interface RoyaltySplit {
  royalty_split_percentage: number;
}

const LabelDesignationManagement = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [royaltySplits, setRoyaltySplits] = useState<Record<string, number>>({});
  const [editingRoyalty, setEditingRoyalty] = useState<string | null>(null);
  const [tempRoyalty, setTempRoyalty] = useState<string>("");

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, label_name, label_type, parent_account_id")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load accounts");
      console.error(error);
    } else {
      setProfiles(data || []);
      
      // Fetch royalty splits for all profiles
      const profileIds = data?.map(p => p.id) || [];
      const { data: royaltyData } = await supabase
        .from("partner_royalty_splits")
        .select("user_id, royalty_split_percentage")
        .in("user_id", profileIds);
      
      const royaltySplitsMap: Record<string, number> = {};
      royaltyData?.forEach(split => {
        royaltySplitsMap[split.user_id] = split.royalty_split_percentage;
      });
      setRoyaltySplits(royaltySplitsMap);
    }
    setLoading(false);
  };

  const updateLabelType = async (profileId: string, labelType: string | null) => {
    setUpdatingId(profileId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          label_type: labelType,
          label_designation_welcome_shown: false // Reset to show welcome dialog
        })
        .eq("id", profileId);

      if (error) throw error;

      // If setting to partner label and no royalty split exists, create one with 70% default
      if (labelType === "partner_label" && !royaltySplits[profileId]) {
        await supabase
          .from("partner_royalty_splits")
          .insert({
            user_id: profileId,
            royalty_split_percentage: 70
          });
      }

      toast.success("Label designation updated successfully");
      fetchProfiles();
    } catch (error: any) {
      toast.error(error.message || "Failed to update label designation");
    } finally {
      setUpdatingId(null);
    }
  };

  const updateRoyaltySplit = async (profileId: string, percentage: number) => {
    try {
      if (percentage < 0 || percentage > 100) {
        toast.error("Royalty split must be between 0 and 100");
        return;
      }

      const { error } = await supabase
        .from("partner_royalty_splits")
        .upsert({
          user_id: profileId,
          royalty_split_percentage: percentage
        });

      if (error) throw error;

      setRoyaltySplits(prev => ({ ...prev, [profileId]: percentage }));
      setEditingRoyalty(null);
      toast.success("Royalty split updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update royalty split");
    }
  };

  const getLabelTypeBadge = (labelType: string | null) => {
    if (!labelType) return <Badge variant="outline">No Designation</Badge>;
    
    switch (labelType) {
      case "partner_label":
        return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Partner Label</Badge>;
      case "signature_label":
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Signature Label</Badge>;
      case "prestige_label":
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Prestige Label</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          <div>
            <CardTitle className="text-2xl font-bold">LABEL DESIGNATIONS</CardTitle>
            <CardDescription>Designate accounts as Partner, Signature, or Prestige labels</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Account</TableHead>
                <TableHead>Label Name</TableHead>
                <TableHead>Current Designation</TableHead>
                <TableHead>Royalty Split</TableHead>
                <TableHead>Change Designation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No accounts found
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div>
                        <p className="font-medium">{profile.full_name || "No Name"}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {profile.label_name ? (
                        <span className="font-medium">{profile.label_name}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">No label name</span>
                      )}
                    </TableCell>
                    <TableCell>{getLabelTypeBadge(profile.label_type)}</TableCell>
                    <TableCell>
                      {profile.parent_account_id ? (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      ) : profile.label_type === "partner_label" ? (
                        editingRoyalty === profile.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={tempRoyalty}
                              onChange={(e) => setTempRoyalty(e.target.value)}
                              className="w-20"
                            />
                            <span className="text-sm">%</span>
                            <Button
                              size="sm"
                              onClick={() => updateRoyaltySplit(profile.id, Number(tempRoyalty))}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingRoyalty(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{royaltySplits[profile.id] || 70}%</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingRoyalty(profile.id);
                                setTempRoyalty(String(royaltySplits[profile.id] || 70));
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        )
                      ) : profile.label_type === "signature_label" || profile.label_type === "prestige_label" ? (
                        <span className="font-medium text-green-500">100%</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.parent_account_id ? (
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium">Subaccount</p>
                          <p className="text-xs">Inherits from parent</p>
                        </div>
                      ) : (
                        <Select
                          value={profile.label_type || "none"}
                          onValueChange={(value) => 
                            updateLabelType(profile.id, value === "none" ? null : value)
                          }
                          disabled={updatingId === profile.id}
                        >
                          <SelectTrigger className="w-[200px] bg-background border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="none">No Designation</SelectItem>
                            <SelectItem value="partner_label">Partner Label</SelectItem>
                            <SelectItem value="signature_label">Signature Label</SelectItem>
                            <SelectItem value="prestige_label">Prestige Label</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 space-y-4 p-4 bg-muted/20 rounded-lg border border-border">
          <h3 className="font-semibold text-sm">Label Designation Types:</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-purple-500">Partner Label:</strong> Label with a custom partner deal arrangement</p>
            <p><strong className="text-blue-500">Signature Label:</strong> Label holding an active Trackball Signature subscription plan</p>
            <p><strong className="text-amber-500">Prestige Label:</strong> Label holding an active Trackball Prestige subscription plan</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LabelDesignationManagement;
