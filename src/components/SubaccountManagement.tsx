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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sublabel User</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Master Account</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sublabelAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No sublabel accounts configured
                  </TableCell>
                </TableRow>
              ) : (
                sublabelAccounts.map((sublabel) => (
                  <TableRow key={sublabel.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {sublabel.avatar_url && (
                          <img
                            src={sublabel.avatar_url}
                            alt={sublabel.display_name || sublabel.full_name}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <span className="font-medium">
                          {sublabel.display_name || sublabel.full_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sublabel.user_id}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{sublabel.email}</TableCell>
                    <TableCell>
                      {sublabel.parent ? (
                        <div>
                          <p className="font-medium">{sublabel.parent.display_name}</p>
                          <p className="text-xs text-muted-foreground">ID: {sublabel.parent.user_id}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSublabel(sublabel.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubaccountManagement;