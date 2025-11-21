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
    
    // Fetch all labels with their owner profiles
    const { data: labelsData } = await supabase
      .from("labels")
      .select(`
        *,
        profiles!labels_user_id_fkey(
          email,
          avatar_url,
          user_id,
          user_plans(
            plans(name)
          )
        )
      `)
      .order("name");

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
              {labelAccounts.map((label: any) => (
                <TableRow key={label.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {label.profiles?.avatar_url && (
                        <img
                          src={label.profiles.avatar_url}
                          alt={label.name}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      {label.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{label.id.slice(0, 8)}</Badge>
                  </TableCell>
                  <TableCell>{label.profiles?.email}</TableCell>
                  <TableCell>
                    <Badge className="bg-gradient-primary">
                      {label.profiles?.user_plans?.[0]?.plans?.name || "N/A"}
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