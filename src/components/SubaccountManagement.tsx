import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

const SubaccountManagement = () => {
  const [labelAccounts, setLabelAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    
    // Fetch all users with Signature or Prestige plans who registered as labels
    const { data: labelsData } = await supabase
      .from("profiles")
      .select(`
        *,
        user_plans!inner(
          plan:plans!inner(name)
        )
      `)
      .or("user_plans.plan.name.eq.Trackball Signature,user_plans.plan.name.eq.Trackball Prestige")
      .not("label_name", "is", null)
      .order("label_name");

    setLabelAccounts(labelsData || []);
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Label Accounts
          </CardTitle>
          <CardDescription>
            Signature and Prestige members registered as labels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label Name</TableHead>
                <TableHead>Account ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labelAccounts.map((label) => (
                <TableRow key={label.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {label.avatar_url && (
                        <img
                          src={label.avatar_url}
                          alt={label.label_name}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      {label.label_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{label.user_id}</Badge>
                  </TableCell>
                  <TableCell>{label.email}</TableCell>
                  <TableCell>
                    <Badge className="bg-gradient-primary">
                      {label.user_plans?.[0]?.plan?.name || "N/A"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {labelAccounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No label accounts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubaccountManagement;