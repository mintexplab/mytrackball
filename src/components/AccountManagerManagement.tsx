import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Clock, User, Mail, Phone, Globe, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Vancouver", label: "Vancouver" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
];

interface User {
  id: string;
  full_name: string;
  email: string;
  account_manager_name: string | null;
  account_manager_email: string | null;
  account_manager_phone: string | null;
  account_manager_timezone: string | null;
}

interface ManagerGroup {
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  managerTimezone: string;
  accounts: User[];
}

const AccountManagerManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [managerTimezone, setManagerTimezone] = useState("America/New_York");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, account_manager_name, account_manager_email, account_manager_phone, account_manager_timezone")
      .order("full_name");

    if (error) {
      toast.error("Failed to load users");
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setManagerName(user.account_manager_name || "");
    setManagerEmail(user.account_manager_email || "");
    setManagerPhone(user.account_manager_phone || "");
    setManagerTimezone(user.account_manager_timezone || "America/New_York");
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        account_manager_name: managerName || null,
        account_manager_email: managerEmail || null,
        account_manager_phone: managerPhone || null,
        account_manager_timezone: managerTimezone,
      })
      .eq("id", selectedUser.id);

    if (error) {
      toast.error("Failed to update account manager");
      console.error(error);
    } else {
      toast.success("Account manager updated successfully");
      setEditDialogOpen(false);
      fetchUsers();
    }
  };

  // Group users by account manager
  const managerGroups: ManagerGroup[] = [];
  const unassignedAccounts: User[] = [];

  users.forEach(user => {
    if (user.account_manager_name) {
      const existingGroup = managerGroups.find(
        g => g.managerEmail === user.account_manager_email
      );
      
      if (existingGroup) {
        existingGroup.accounts.push(user);
      } else {
        managerGroups.push({
          managerName: user.account_manager_name,
          managerEmail: user.account_manager_email || "",
          managerPhone: user.account_manager_phone || "",
          managerTimezone: user.account_manager_timezone || "America/New_York",
          accounts: [user]
        });
      }
    } else {
      unassignedAccounts.push(user);
    }
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Account Manager Assignment
          </CardTitle>
          <CardDescription>View and manage account manager assignments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Manager Groups */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Active Account Managers</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {managerGroups.map((group, idx) => (
                <Card key={idx} className="bg-card/50 border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          {group.managerName}
                        </CardTitle>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {group.managerEmail}
                          </div>
                          {group.managerPhone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {group.managerPhone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {TIMEZONES.find(tz => tz.value === group.managerTimezone)?.label || group.managerTimezone}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-primary/20 text-primary">
                        {group.accounts.length} {group.accounts.length === 1 ? 'Account' : 'Accounts'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Assigned Accounts</p>
                      <div className="space-y-1">
                        {group.accounts.map(account => (
                          <div key={account.id} className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{account.full_name || "No name"}</p>
                              <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUserSelect(account)}
                              className="shrink-0"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Unassigned Accounts */}
          {unassignedAccounts.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="text-lg font-semibold">Unassigned Accounts</h3>
              <Card className="bg-muted/20 border-border">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {unassignedAccounts.map(account => (
                      <div key={account.id} className="flex items-center justify-between p-2 rounded bg-card/50 hover:bg-card transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{account.full_name || "No name"}</p>
                          <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserSelect(account)}
                          className="shrink-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-bold">Assign Account Manager</DialogTitle>
            <DialogDescription>
              Configure account manager for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="manager-name">Account Manager Name</Label>
              <Input
                id="manager-name"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Enter manager name"
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager-email">Account Manager Email</Label>
              <Input
                id="manager-email"
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="Enter manager email"
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager-phone">Account Manager Phone</Label>
              <Input
                id="manager-phone"
                type="tel"
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                placeholder="Enter manager phone"
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager-timezone">Account Manager Timezone</Label>
              <Select value={managerTimezone} onValueChange={setManagerTimezone}>
                <SelectTrigger id="manager-timezone" className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSave}
              className="bg-gradient-primary hover:opacity-90 w-full"
            >
              Save Account Manager
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccountManagerManagement;
