import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, DollarSign, Loader2, Search, TestTube } from "lucide-react";

interface FineManagementProps {
  users?: any[];
  onFineIssued?: () => void;
}

const FINE_TYPES = [
  { value: "copyright_strike", label: "Copyright Strike" },
  { value: "platform_misuse", label: "Platform Misuse" },
  { value: "tos_violation", label: "Terms of Service Violation" },
  { value: "other", label: "Other" },
];

export const FineManagement = ({ users: propUsers, onFineIssued }: FineManagementProps) => {
  const [users, setUsers] = useState<any[]>(propUsers || []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [fineType, setFineType] = useState("");
  const [fineReason, setFineReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMockFine, setIsMockFine] = useState(false);

  useEffect(() => {
    if (!propUsers || propUsers.length === 0) {
      fetchUsers();
    }
  }, [propUsers]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, user_id, strike_count")
      .order("created_at", { ascending: false });
    setUsers(data || []);
  };

  const filteredUsers = users.filter(u =>
    !u.roles?.includes('admin') && 
    (u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     u.user_id?.includes(searchTerm))
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  const handleIssueFine = async () => {
    if (!selectedUserId || !fineAmount || !fineType || !fineReason) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(fineAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid fine amount");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current strike count
      const { data: profile } = await supabase
        .from("profiles")
        .select("strike_count")
        .eq("id", selectedUserId)
        .single();

      const currentStrikes = profile?.strike_count || 0;
      // Mock fines don't count towards strikes
      const newStrikeNumber = isMockFine ? 0 : currentStrikes + 1;

      // Insert the fine - always pending so user sees dialog
      const { error } = await supabase
        .from("user_fines")
        .insert({
          user_id: selectedUserId,
          amount: amount,
          reason: fineReason,
          fine_type: fineType,
          strike_number: newStrikeNumber,
          issued_by: user.id,
          notes: isMockFine ? `[MOCK FINE] ${notes || ''}`.trim() : (notes || null),
          status: "pending", // Always pending so dialog shows
        });

      if (error) throw error;

      // If this is the 3rd strike, automatically add the $55 penalty fee
      if (newStrikeNumber >= 3 && !isMockFine) {
        await supabase
          .from("user_fines")
          .insert({
            user_id: selectedUserId,
            amount: 55,
            reason: "Account suspension penalty - 3 strikes reached",
            fine_type: "other",
            strike_number: 3,
            issued_by: user.id,
            notes: "Automatic penalty for reaching 3 strikes",
          });

        toast.warning(`User has reached 3 strikes and has been suspended. $55 CAD penalty added.`);
      }

      const fineLabel = isMockFine ? "Mock fine" : "Fine";
      toast.success(`${fineLabel} of $${amount} CAD issued successfully (Strike ${newStrikeNumber}/3)`);
      
      // Reset form
      setSelectedUserId("");
      setFineAmount("");
      setFineType("");
      setFineReason("");
      setNotes("");
      setIsMockFine(false);
      setDialogOpen(false);
      fetchUsers();
      onFineIssued?.();
    } catch (error: any) {
      console.error("Error issuing fine:", error);
      toast.error(error.message || "Failed to issue fine");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              FINE MANAGEMENT
            </CardTitle>
            <CardDescription>Issue fines for copyright strikes, platform misuse, and TOS violations</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <DollarSign className="w-4 h-4 mr-2" />
                Issue Fine
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Issue Fine
                </DialogTitle>
                <DialogDescription>
                  Issue a fine to a user's account. They will be required to authorize payment or face a 1-week lock.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* User Search */}
                <div className="space-y-2">
                  <Label>Select User *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email, name, or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background/50 border-border"
                    />
                  </div>
                  {searchTerm && filteredUsers.length > 0 && !selectedUserId && (
                    <div className="max-h-40 overflow-y-auto border border-border rounded-md bg-background/50">
                      {filteredUsers.slice(0, 5).map((user) => (
                        <div
                          key={user.id}
                          className="p-2 hover:bg-muted cursor-pointer text-sm"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setSearchTerm("");
                          }}
                        >
                          <div className="font-medium">{user.full_name || user.email}</div>
                          <div className="text-xs text-muted-foreground">{user.email} • ID: {user.user_id}</div>
                          <div className="text-xs text-muted-foreground">
                            Current strikes: {user.strike_count || 0}/3
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedUser && (
                    <div className="p-3 border border-primary/30 rounded-md bg-primary/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{selectedUser.full_name || selectedUser.email}</div>
                          <div className="text-xs text-muted-foreground">{selectedUser.email}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant={selectedUser.strike_count >= 2 ? "destructive" : "outline"}>
                            {selectedUser.strike_count || 0}/3 Strikes
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={() => setSelectedUserId("")}
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                      {(selectedUser.strike_count || 0) >= 2 && (
                        <p className="text-xs text-destructive mt-2">
                          ⚠️ This user is on their final warning. Next fine will suspend their account + $55 CAD penalty.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Fine Type */}
                <div className="space-y-2">
                  <Label>Fine Type *</Label>
                  <Select value={fineType} onValueChange={setFineType}>
                    <SelectTrigger className="bg-background/50 border-border">
                      <SelectValue placeholder="Select fine type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {FINE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fine Amount */}
                <div className="space-y-2">
                  <Label>Fine Amount (CAD) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={fineAmount}
                      onChange={(e) => setFineAmount(e.target.value)}
                      className="pl-10 bg-background/50 border-border"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label>Reason (shown to user) *</Label>
                  <Textarea
                    placeholder="Describe the reason for this fine..."
                    value={fineReason}
                    onChange={(e) => setFineReason(e.target.value)}
                    className="bg-background/50 border-border min-h-[80px]"
                  />
                </div>

                {/* Mock Fine Toggle */}
                <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TestTube className="w-4 h-4 text-yellow-500" />
                    <div>
                      <Label className="text-sm font-medium">Mock Fine (Testing)</Label>
                      <p className="text-xs text-muted-foreground">
                        Issue fine for record-keeping only, no payment required
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isMockFine}
                    onCheckedChange={setIsMockFine}
                  />
                </div>

                {/* Admin Notes */}
                <div className="space-y-2">
                  <Label>Admin Notes (optional)</Label>
                  <Textarea
                    placeholder="Internal notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-background/50 border-border"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleIssueFine}
                    disabled={loading || !selectedUserId || !fineAmount || !fineType || !fineReason}
                    className="flex-1 bg-destructive hover:bg-destructive/90"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Issuing...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Issue Fine
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Users who receive 3 fines will have their accounts automatically suspended with a $55 CAD penalty fee.
          When a fine is issued, users must authorize payment from their saved card or face a 1-week account lock.
        </p>
      </CardContent>
    </Card>
  );
};
