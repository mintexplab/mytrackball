import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";
import { z } from "zod";

const emailSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

export const EmailNotificationDialog = () => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, display_name")
      .order("full_name", { ascending: true });

    setUsers(data || []);
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
    setSelectAll(!selectAll);
  };

  const sendEmails = async () => {
    try {
      const validatedData = emailSchema.parse({ subject, message });

      if (!selectAll && selectedUsers.length === 0) {
        toast.error("Please select at least one user");
        return;
      }

      setSending(true);

      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('send-user-email', {
        body: {
          userIds: selectAll ? "all" : selectedUsers,
          subject: validatedData.subject,
          message: validatedData.message,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      toast.success(`Emails sent successfully! ${data.successCount} sent, ${data.failureCount} failed`);
      setOpen(false);
      setSubject("");
      setMessage("");
      setSelectedUsers([]);
      setSelectAll(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error sending emails:", error);
        toast.error("Failed to send emails");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Mail className="w-4 h-4 mr-2" />
          Send Email to Users
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold">Send Email Notification</DialogTitle>
          <DialogDescription>
            Send an email notification to selected users or all users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Important Update"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-background border-border"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {subject.length}/200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-background border-border min-h-[150px]"
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/5000 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label>Recipients</Label>
            <div className="flex items-center space-x-2 mb-3 p-3 bg-muted/30 rounded-lg">
              <Checkbox
                id="select-all"
                checked={selectAll}
                onCheckedChange={toggleSelectAll}
              />
              <Label htmlFor="select-all" className="cursor-pointer font-medium">
                Send to all users ({users.length} users)
              </Label>
            </div>

            {!selectAll && (
              <div className="border border-border rounded-lg max-h-[200px] overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 p-2 hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <Label htmlFor={user.id} className="cursor-pointer flex-1">
                      <div>
                        <p className="font-medium">
                          {user.display_name || user.full_name || "No name"}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {!selectAll && selectedUsers.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <Button
            onClick={sendEmails}
            disabled={sending}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
