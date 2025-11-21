import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SubaccountManagement = () => {
  const [masterAccounts, setMasterAccounts] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [sublabelAccounts, setSublabelAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState("");
  const [selectedSubaccount, setSelectedSubaccount] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    
    // Fetch all users with Signature or Prestige plans (potential masters)
    const { data: mastersData } = await supabase
      .from("profiles")
      .select(`
        *,
        user_plans!inner(
          plan:plans!inner(name)
        )
      `)
      .or("user_plans.plan.name.eq.Trackball Signature,user_plans.plan.name.eq.Trackball Prestige");

    // Fetch all users for sublabel assignment
    const { data: allUsersData } = await supabase
      .from("profiles")
      .select("*")
      .order("display_name");

    // Fetch all sublabel accounts
    const { data: sublabelsData } = await supabase
      .from("profiles")
      .select(`
        *,
        parent:profiles!parent_account_id(display_name, user_id)
      `)
      .not("parent_account_id", "is", null);

    setMasterAccounts(mastersData || []);
    setAllUsers(allUsersData || []);
    setSublabelAccounts(sublabelsData || []);
    setLoading(false);
  };

  const assignSublabel = async () => {
    if (!selectedMaster || !selectedSubaccount) {
      toast.error("Please select both master account and sublabel account");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ parent_account_id: selectedMaster })
      .eq("id", selectedSubaccount);

    if (error) {
      toast.error("Failed to assign sublabel");
      return;
    }

    toast.success("Sublabel assigned successfully");
    setDialogOpen(false);
    setSelectedMaster("");
    setSelectedSubaccount("");
    fetchAccounts();
  };

  const removeSublabel = async (sublabelId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ parent_account_id: null })
      .eq("id", sublabelId);

    if (error) {
      toast.error("Failed to remove sublabel");
      return;
    }

    toast.success("Sublabel removed successfully");
    fetchAccounts();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Master & Sublabel Accounts
              </CardTitle>
              <CardDescription>
                Manage label hierarchies for Signature and Prestige users
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign Sublabel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Sublabel Account</DialogTitle>
                  <DialogDescription>
                    Connect a user account as a sublabel under a master account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Master Account (Signature/Prestige)</Label>
                    <Select value={selectedMaster} onValueChange={setSelectedMaster}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select master account" />
                      </SelectTrigger>
                      <SelectContent>
                        {masterAccounts.map((master) => (
                          <SelectItem key={master.id} value={master.id}>
                            {master.display_name || master.full_name} (ID: {master.user_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Sublabel Account</Label>
                    <Select value={selectedSubaccount} onValueChange={setSelectedSubaccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sublabel account" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.display_name || user.full_name} (ID: {user.user_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={assignSublabel} className="w-full bg-gradient-primary">
                    Assign Sublabel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {masterAccounts.map((master) => {
              const sublabels = sublabelAccounts.filter(
                (sub) => sub.parent_account_id === master.id
              );
              
              return (
                <div key={master.id} className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-primary/20">
                    {master.avatar_url && (
                      <img
                        src={master.avatar_url}
                        alt={master.display_name || master.full_name}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">
                        {master.display_name || master.full_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{master.user_id}</Badge>
                        <span>•</span>
                        <span>{master.email}</span>
                      </div>
                    </div>
                    <Badge className="bg-gradient-primary">Master Label</Badge>
                  </div>

                  {sublabels.length > 0 ? (
                    <div className="ml-8 space-y-2">
                      {sublabels.map((sublabel) => (
                        <div
                          key={sublabel.id}
                          className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border"
                        >
                          {sublabel.avatar_url && (
                            <img
                              src={sublabel.avatar_url}
                              alt={sublabel.display_name || sublabel.full_name}
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">
                              {sublabel.display_name || sublabel.full_name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">
                                {sublabel.user_id}
                              </Badge>
                              <span>•</span>
                              <span>{sublabel.email}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSublabel(sublabel.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ml-8 p-3 text-sm text-muted-foreground italic">
                      No sublabels assigned
                    </div>
                  )}
                </div>
              );
            })}

            {masterAccounts.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No master labels found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubaccountManagement;