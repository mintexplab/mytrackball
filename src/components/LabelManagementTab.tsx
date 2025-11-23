import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Building2, LogOut, Crown, Users, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
interface LabelMembership {
  id: string;
  label_id: string;
  label_name: string;
  role: string;
  joined_at: string;
}
interface LabelManagementTabProps {
  userId: string;
  userPlan: any;
}
const LabelManagementTab = ({
  userId,
  userPlan
}: LabelManagementTabProps) => {
  const [memberships, setMemberships] = useState<LabelMembership[]>([]);
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [labelName, setLabelName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leavingLabelId, setLeavingLabelId] = useState<string | null>(null);
  useEffect(() => {
    fetchLabelData();
  }, [userId]);
  const fetchLabelData = async () => {
    try {
      // Get profile
      const {
        data: profile
      } = await supabase.from("profiles").select("id, active_label_id, label_name, email").eq("id", userId).single();
      if (profile) {
        setActiveLabelId(profile.active_label_id);
        setLabelName(profile.label_name || "");

        // Get all label memberships
        const {
          data: membershipData
        } = await supabase.from("user_label_memberships").select("*").eq("user_id", profile.id).order("joined_at", {
          ascending: false
        });
        if (membershipData) {
          setMemberships(membershipData);
        }
      }
    } catch (error) {
      console.error("Error fetching label data:", error);
      toast.error("Failed to load label data");
    } finally {
      setLoading(false);
    }
  };
  const saveLabelName = async () => {
    setSaving(true);
    try {
      const canEditLabel = userPlan?.plan?.name === "Trackball Signature" || userPlan?.plan?.name === "Trackball Prestige";
      if (!canEditLabel) {
        toast.error("Label name is only available for Signature and Prestige members");
        return;
      }
      if (!labelName.trim()) {
        toast.error("Please enter a label name");
        return;
      }

      // Check if label already exists
      const {
        data: existingLabel
      } = await supabase.from("labels").select("id").eq("user_id", userId).maybeSingle();
      if (existingLabel) {
        // Update existing label
        await supabase.from("labels").update({
          name: labelName
        }).eq("id", existingLabel.id);
        await supabase.from("profiles").update({
          label_name: labelName,
          label_id: existingLabel.id
        }).eq("id", userId);
      } else {
        // Create new label
        const {
          data: newLabel,
          error: labelError
        } = await supabase.from("labels").insert({
          name: labelName,
          user_id: userId
        }).select().single();
        if (labelError) throw labelError;
        await supabase.from("profiles").update({
          label_name: labelName,
          label_id: newLabel.id
        }).eq("id", userId);
      }
      toast.success("Label name saved successfully");
      fetchLabelData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save label name");
    } finally {
      setSaving(false);
    }
  };
  const switchToLabel = async (labelId: string, labelNameToSwitch: string) => {
    try {
      const {
        error
      } = await supabase.from("profiles").update({
        active_label_id: labelId,
        label_name: labelNameToSwitch
      }).eq("id", userId);
      if (error) throw error;
      setActiveLabelId(labelId);
      toast.success(`Switched to ${labelNameToSwitch}`);
      fetchLabelData();
    } catch (error: any) {
      toast.error(error.message || "Failed to switch label");
    }
  };
  const leaveLabel = async (membershipId: string, labelNameToLeave: string, labelId: string) => {
    setLeavingLabelId(membershipId);
    try {
      // Delete membership
      const {
        error
      } = await supabase.from("user_label_memberships").delete().eq("id", membershipId);
      if (error) throw error;

      // If this was the active label, switch to another one or null
      if (activeLabelId === labelId) {
        const remainingMemberships = memberships.filter(m => m.id !== membershipId);
        if (remainingMemberships.length > 0) {
          await switchToLabel(remainingMemberships[0].label_id, remainingMemberships[0].label_name);
        } else {
          // No more labels, clear active label
          await supabase.from("profiles").update({
            active_label_id: null,
            label_name: null,
            label_id: null
          }).eq("id", userId);
          setActiveLabelId(null);
        }
      }
      toast.success(`Left ${labelNameToLeave}`);
      fetchLabelData();
    } catch (error: any) {
      toast.error(error.message || "Failed to leave label");
    } finally {
      setLeavingLabelId(null);
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  const canEditLabel = userPlan?.plan?.name === "Trackball Signature" || userPlan?.plan?.name === "Trackball Prestige";
  return <div className="space-y-6">
      {/* Label Name Section */}
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            YOUR LABEL NAME
          </CardTitle>
          <CardDescription>
            {canEditLabel ? "Set your label name for Signature and Prestige members" : "Label name is only available for Signature and Prestige members"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label_name">Label Name</Label>
            <Input id="label_name" placeholder="Your Label" value={labelName} onChange={e => setLabelName(e.target.value)} className="bg-background/50 border-border" disabled={!canEditLabel || saving} />
          </div>
          <Button onClick={saveLabelName} disabled={!canEditLabel || saving || !labelName.trim()} className="bg-gradient-primary hover:opacity-90">
            {saving ? "Saving..." : "Save Label Name"}
          </Button>
        </CardContent>
      </Card>

      {/* Label Memberships Section */}
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            LABEL MEMBERSHIPS
          </CardTitle>
          <CardDescription>
            The label or labels you are affiliated with
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>You are not part of any labels yet.</p>
              <p className="text-sm mt-2">Accept a label invitation to get started.</p>
            </div> : <div className="space-y-4">
              {memberships.map(membership => {
            const isActive = activeLabelId === membership.label_id;
            const isOwner = membership.role === "owner";
            return <Card key={membership.id} className={`border-2 transition-all ${isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold">{membership.label_name}</h3>
                            {isActive && <Badge className="bg-gradient-primary text-white gap-1">
                                <Check className="w-3 h-3" />
                                Active
                              </Badge>}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="outline" className="gap-1">
                              {isOwner ? <>
                                  <Crown className="w-3 h-3" />
                                  Owner
                                </> : <>
                                  <Users className="w-3 h-3" />
                                  Member
                                </>}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Joined {formatDistanceToNow(new Date(membership.joined_at), {
                          addSuffix: true
                        })}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {!isActive && <Button variant="outline" size="sm" onClick={() => switchToLabel(membership.label_id, membership.label_name)} className="gap-2">
                              Switch To
                            </Button>}
                          
                          {!isOwner && <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="gap-2" disabled={leavingLabelId === membership.id}>
                                  <LogOut className="w-4 h-4" />
                                  Leave
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Leave {membership.label_name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to leave this label? You will lose access to all releases and data associated with this label. 
                                    {isActive && " Since this is your active label, you will be switched to another label."}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => leaveLabel(membership.id, membership.label_name, membership.label_id)} className="bg-destructive hover:bg-destructive/90">
                                    Leave Label
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>}

                          {isOwner && <Button variant="outline" size="sm" disabled className="gap-2 opacity-50">
                              <Crown className="w-4 h-4" />
                              Owner
                            </Button>}
                        </div>
                      </div>

                      {isOwner && <div className="bg-muted/30 rounded-lg p-3 mt-4">
                          <p className="text-xs text-muted-foreground">
                            <Crown className="w-3 h-3 inline mr-1" />
                            As the owner of this label, you cannot modify anything related to it besides its name. Delete your account to have this label deleted.                     
                          </p>
                        </div>}
                    </CardContent>
                  </Card>;
          })}
            </div>}
        </CardContent>
      </Card>
    </div>;
};
export default LabelManagementTab;