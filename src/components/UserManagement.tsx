import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Package } from "lucide-react";

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        user_plans (
          *,
          plan:plans(*)
        )
      `);

    if (error) {
      toast.error("Failed to load users");
      return;
    }

    setUsers(data || []);
    setLoading(false);
  };

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("plans")
      .select("*")
      .order("price", { ascending: true });

    setPlans(data || []);
  };

  const assignPlan = async (userId: string, planId: string) => {
    const { error: deleteError } = await supabase
      .from("user_plans")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      toast.error("Failed to update plan");
      return;
    }

    const { error: insertError } = await supabase
      .from("user_plans")
      .insert({
        user_id: userId,
        plan_id: planId,
        status: "active",
      });

    if (insertError) {
      toast.error("Failed to assign plan");
      return;
    }

    toast.success("Plan assigned successfully");
    fetchUsers();
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
        <CardTitle className="text-2xl">User Management</CardTitle>
        <CardDescription>Manage user accounts and assign distribution plans</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Plan</TableHead>
                <TableHead>Assign Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    {user.full_name || "No name"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    {user.user_plans?.[0]?.plan ? (
                      <Badge className="bg-gradient-primary text-white">
                        {user.user_plans[0].plan.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No Plan</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      onValueChange={(planId) => assignPlan(user.id, planId)}
                      defaultValue={user.user_plans?.[0]?.plan_id}
                    >
                      <SelectTrigger className="w-[180px] bg-background/50 border-border">
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              {plan.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
