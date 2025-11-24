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

      // Create default royalty splits based on label type
      if (labelType === "Partner" && !royaltySplits[profileId]) {
        await supabase
          .from("partner_royalty_splits")
          .insert({
            user_id: profileId,
            royalty_split_percentage: 50
          });
      } else if (labelType === "Label Free") {
        await supabase
          .from("partner_royalty_splits")
          .upsert({
            user_id: profileId,
            royalty_split_percentage: 70
          }, { onConflict: 'user_id' });
      } else if (labelType === "Label Lite") {
        await supabase
          .from("partner_royalty_splits")
          .upsert({
            user_id: profileId,
            royalty_split_percentage: 90
          }, { onConflict: 'user_id' });
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
      case "Partner":
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Partner</Badge>;
      case "Signature":
        return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Signature</Badge>;
      case "Prestige":
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Prestige</Badge>;
      case "Label Free":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Label Free</Badge>;
      case "Label Lite":
        return <Badge className="bg-cyan-500/20 text-cyan-500 border-cyan-500/30">Label Lite</Badge>;
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
                      ) : profile.label_type === "Partner" ? (
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
                            <span className="font-medium">{royaltySplits[profile.id] || 50}%</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingRoyalty(profile.id);
                                setTempRoyalty(String(royaltySplits[profile.id] || 50));
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        )
                      ) : profile.label_type === "Label Free" ? (
                        <span className="font-medium">70%</span>
                      ) : profile.label_type === "Label Lite" ? (
                        <span className="font-medium">90%</span>
                      ) : profile.label_type === "Signature" || profile.label_type === "Prestige" ? (
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
                            <SelectItem value="Partner">Partner</SelectItem>
                            <SelectItem value="Signature">Signature</SelectItem>
                            <SelectItem value="Prestige">Prestige</SelectItem>
                            <SelectItem value="Label Free">Label Free</SelectItem>
                            <SelectItem value="Label Lite">Label Lite</SelectItem>
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
            <p><strong className="text-blue-500">Partner:</strong> 50% royalty split - Standard partnership tier</p>
            <p><strong className="text-purple-500">Signature:</strong> 100% royalty - Premium tier with enhanced features</p>
            <p><strong className="text-amber-500">Prestige:</strong> 100% royalty - Highest tier with exclusive benefits</p>
            <p><strong className="text-green-500">Label Free:</strong> 70% royalty split - Entry level label tier</p>
            <p><strong className="text-cyan-500">Label Lite:</strong> 90% royalty split - Advanced label tier</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LabelDesignationManagement;
