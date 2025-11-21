import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DollarSign, Plus } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface Royalty {
  id: string;
  user_id: string;
  amount: number;
  period: string;
  notes: string;
  created_at: string;
  profiles: {
    email: string;
    full_name: string;
  };
}

const RoyaltiesManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [royalties, setRoyalties] = useState<Royalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchRoyalties();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .order("email");

    if (error) {
      toast.error("Failed to load users");
      return;
    }

    setUsers(data || []);
  };

  const fetchRoyalties = async () => {
    const { data, error } = await supabase
      .from("royalties")
      .select(`
        *,
        profiles!royalties_user_id_fkey (
          email,
          full_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load royalties");
      return;
    }

    setRoyalties(data || []);
    setLoading(false);
  };

  const addRoyalty = async () => {
    if (!selectedUserId || !amount || !period) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { error } = await supabase
      .from("royalties")
      .insert({
        user_id: selectedUserId,
        amount: parseFloat(amount),
        period,
        notes,
      });

    if (error) {
      toast.error("Failed to add royalty");
      return;
    }

    toast.success("Royalty added successfully");
    setDialogOpen(false);
    setSelectedUserId("");
    setAmount("");
    setPeriod("");
    setNotes("");
    fetchRoyalties();
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Royalties Management</CardTitle>
            <CardDescription>Track and manage user royalty payments</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Add Royalty
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-bold">Add Royalty Payment</DialogTitle>
                <DialogDescription>Record a royalty payment for a user</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="user">User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (CAD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Input
                    id="period"
                    placeholder="e.g., January 2025, Q1 2025"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional information about this payment"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
                <Button onClick={addRoyalty} className="w-full bg-gradient-primary hover:opacity-90">
                  Add Royalty
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {royalties.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No royalties recorded yet</p>
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {royalties.map((royalty) => (
                  <TableRow key={royalty.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      {royalty.profiles.full_name || royalty.profiles.email}
                    </TableCell>
                    <TableCell className="text-green-500 font-semibold">
                      ${parseFloat(royalty.amount.toString()).toFixed(2)} CAD
                    </TableCell>
                    <TableCell>{royalty.period}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {royalty.notes || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(royalty.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoyaltiesManagement;
