import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Building2, LogOut, Crown, Users, Check, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import trackballLogo from "@/assets/trackball-logo.png";

interface LabelMembership {
  id: string;
  label_id: string;
  label_name: string;
  role: string;
  joined_at: string;
}

interface ServiceAccess {
  label_id: string;
  services: string[];
}

const serviceLabels: Record<string, string> = {
  catalog: "Catalog Management",
  royalties: "Royalties & Earnings",
  publishing: "Publishing",
  announcements: "Announcements",
  support: "Support Access",
  settings: "Account Settings"
};

const LabelManagement = () => {
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState<LabelMembership[]>([]);
  const [serviceAccess, setServiceAccess] = useState<Record<string, string[]>>({});
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leavingLabelId, setLeavingLabelId] = useState<string | null>(null);

  useEffect(() => {
    fetchLabelMemberships();
  }, []);

  const fetchLabelMemberships = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get profile to see active label
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, active_label_id, email")
        .eq("id", user.id)
        .single();

      if (profile) {
        setActiveLabelId(profile.active_label_id);

        // Get all label memberships
        const { data: membershipData } = await supabase
          .from("user_label_memberships")
          .select("*")
          .eq("user_id", profile.id)
          .order("joined_at", { ascending: false });

        if (membershipData) {
          setMemberships(membershipData);

          // Fetch service access for partner labels
          const { data: invitations } = await supabase
            .from("label_invitations")
            .select("master_account_email, service_access")
            .eq("master_account_email", profile.email)
            .eq("status", "accepted");

          const accessMap: Record<string, string[]> = {};
          invitations?.forEach(inv => {
            const membership = membershipData.find(m => 
              inv.master_account_email === profile.email
            );
            if (membership && inv.service_access) {
              accessMap[membership.label_id] = inv.service_access;
            }
          });
          setServiceAccess(accessMap);
        }
      }
    } catch (error) {
      console.error("Error fetching memberships:", error);
      toast.error("Failed to load label memberships");
    } finally {
      setLoading(false);
    }
  };

  const switchToLabel = async (labelId: string, labelName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ 
          active_label_id: labelId,
          label_name: labelName 
        })
        .eq("id", user.id);

      if (error) throw error;

      setActiveLabelId(labelId);
      toast.success(`Switched to ${labelName}`);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to switch label");
    }
  };

  const leaveLabel = async (membershipId: string, labelName: string, labelId: string) => {
    setLeavingLabelId(membershipId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete membership
      const { error } = await supabase
        .from("user_label_memberships")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;

      // If this was the active label, switch to another one or null
      if (activeLabelId === labelId) {
        const remainingMemberships = memberships.filter(m => m.id !== membershipId);
        
        if (remainingMemberships.length > 0) {
          await switchToLabel(remainingMemberships[0].label_id, remainingMemberships[0].label_name);
        } else {
          // No more labels, clear active label
          await supabase
            .from("profiles")
            .update({ 
              active_label_id: null,
              label_name: null,
              label_id: null
            })
            .eq("id", user.id);
          
          setActiveLabelId(null);
        }
      }

      toast.success(`Left ${labelName}`);
      fetchLabelMemberships();
    } catch (error: any) {
      toast.error(error.message || "Failed to leave label");
    } finally {
      setLeavingLabelId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="absolute inset-0 bg-gradient-accent opacity-5 blur-3xl" />
      
      {/* Header */}
      <div className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center overflow-hidden">
              <img src={trackballLogo} alt="Trackball Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Label Management
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage your label memberships
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 relative">
        <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              YOUR LABELS
            </CardTitle>
            <CardDescription>
              {memberships.length === 0 
                ? "You are not a member of any labels yet"
                : `You are a member of ${memberships.length} label${memberships.length > 1 ? 's' : ''}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>You are not part of any labels yet.</p>
                <p className="text-sm mt-2">Accept a label invitation to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {memberships.map((membership) => {
                  const isActive = activeLabelId === membership.label_id;
                  const isOwner = membership.role === "owner";
                  const services = serviceAccess[membership.label_id] || [];

                  return (
                    <Card 
                      key={membership.id} 
                      className={`border-2 transition-all ${
                        isActive 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold">{membership.label_name}</h3>
                              {isActive && (
                                <Badge className="bg-gradient-primary text-white gap-1">
                                  <Check className="w-3 h-3" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge variant="outline" className="gap-1">
                                {isOwner ? (
                                  <>
                                    <Crown className="w-3 h-3" />
                                    Owner
                                  </>
                                ) : (
                                  <>
                                    <Users className="w-3 h-3" />
                                    Member
                                  </>
                                )}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Joined {formatDistanceToNow(new Date(membership.joined_at), { addSuffix: true })}
                              </Badge>
                            </div>

                            {/* Service Access */}
                            {services.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm text-muted-foreground mb-2">Service Access:</p>
                                <div className="flex flex-wrap gap-2">
                                  {services.map((service) => (
                                    <Badge key={service} variant="outline" className="text-xs">
                                      {serviceLabels[service] || service}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {!isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => switchToLabel(membership.label_id, membership.label_name)}
                                className="gap-2"
                              >
                                Switch To
                              </Button>
                            )}
                            
                            {!isOwner && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-2"
                                    disabled={leavingLabelId === membership.id}
                                  >
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
                                    <AlertDialogAction
                                      onClick={() => leaveLabel(membership.id, membership.label_name, membership.label_id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Leave Label
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {isOwner && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="gap-2 opacity-50"
                              >
                                <Crown className="w-4 h-4" />
                                Owner
                              </Button>
                            )}
                          </div>
                        </div>

                        {isOwner && (
                          <div className="bg-muted/30 rounded-lg p-3 mt-4">
                            <p className="text-xs text-muted-foreground">
                              <Crown className="w-3 h-3 inline mr-1" />
                              As the owner of this label, you cannot leave. Transfer ownership or delete the label to remove your membership.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LabelManagement;
