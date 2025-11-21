import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Clock } from "lucide-react";

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

const AccountManagerManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("");
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

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    const user = users.find(u => u.id === userId);
    if (user) {
      setManagerName(user.account_manager_name || "");
      setManagerEmail(user.account_manager_email || "");
      setManagerPhone(user.account_manager_phone || "");
      setManagerTimezone(user.account_manager_timezone || "America/New_York");
    }
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
      .eq("id", selectedUser);

    if (error) {
      toast.error("Failed to update account manager");
      console.error(error);
    } else {
      toast.success("Account manager updated successfully");
      fetchUsers();
    }
  };

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
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          Account Manager Assignment
        </CardTitle>
        <CardDescription>Assign account managers to users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="user-select">Select User</Label>
          <Select value={selectedUser} onValueChange={handleUserSelect}>
            <SelectTrigger id="user-select">
              <SelectValue placeholder="Choose a user..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email} - {user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUser && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="manager-name">Account Manager Name</Label>
              <Input
                id="manager-name"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Enter manager name"
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager-timezone">Account Manager Timezone</Label>
              <Select value={managerTimezone} onValueChange={setManagerTimezone}>
                <SelectTrigger id="manager-timezone">
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
        )}
      </CardContent>
    </Card>
  );
};

export default AccountManagerManagement;
