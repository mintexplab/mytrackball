import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageSquare, Send, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";

const replySchema = z.object({
  message: z.string().min(1, "Reply cannot be empty").max(2000),
  escalationEmail: z.string().email().optional().or(z.literal(""))
});

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  escalation_email: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    email: string;
    display_name: string;
    full_name: string;
  };
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  user_id: string | null;
}

export const AdminTicketManagement = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [escalationEmail, setEscalationEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("open");

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      setNewStatus(selectedTicket.status);
      setEscalationEmail(selectedTicket.escalation_email || "");
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, display_name, full_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const ticketsWithProfiles = data.map(ticket => ({
          ...ticket,
          profiles: profileMap.get(ticket.user_id) || {
            email: "unknown@email.com",
            display_name: "Unknown User",
            full_name: "Unknown User"
          }
        }));

        setTickets(ticketsWithProfiles);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const sendReply = async () => {
    if (!selectedTicket) return;

    try {
      const validated = replySchema.parse({ 
        message: replyMessage,
        escalationEmail: escalationEmail || undefined
      });
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Add message to ticket
      const { error: messageError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: validated.message,
          is_admin_reply: true
        });

      if (messageError) throw messageError;

      // Update ticket status and escalation email if provided
      const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (escalationEmail && newStatus === "escalated") {
        updateData.escalation_email = escalationEmail;
      }

      const { error: updateError } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", selectedTicket.id);

      if (updateError) throw updateError;

      // Send email notification to user
      await supabase.functions.invoke("send-ticket-reply", {
        body: {
          ticketId: selectedTicket.id,
          userEmail: selectedTicket.profiles?.email,
          userName: selectedTicket.profiles?.display_name || selectedTicket.profiles?.full_name,
          subject: selectedTicket.subject,
          replyMessage: validated.message,
          ticketStatus: newStatus,
          escalationEmail: newStatus === "escalated" ? escalationEmail : null
        }
      });

      setReplyMessage("");
      fetchMessages(selectedTicket.id);
      fetchTickets();
      toast.success("Reply sent and user notified!");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error sending reply:", error);
        toast.error("Failed to send reply");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      if (error) throw error;
      toast.success(`Ticket marked as ${status}`);
      fetchTickets();
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update ticket");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      open: { variant: "default", icon: Clock },
      in_progress: { variant: "secondary", icon: MessageSquare },
      resolved: { variant: "outline", icon: CheckCircle2 },
      escalated: { variant: "destructive", icon: AlertTriangle }
    };

    const config = variants[status] || variants.open;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "text-blue-500",
      medium: "text-yellow-500",
      high: "text-red-500"
    };
    return colors[priority] || colors.medium;
  };

  const filteredTickets = tickets.filter(ticket => {
    if (activeTab === "all") return true;
    return ticket.status === activeTab;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Support Tickets</h2>
        <p className="text-muted-foreground">Manage and respond to user support requests</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="escalated">Escalated</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center py-8">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <Card className="bg-card/50 border-border">
              <CardContent className="py-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No {activeTab !== "all" ? activeTab : ""} tickets</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredTickets.map((ticket) => (
                <Card 
                  key={ticket.id} 
                  className="bg-card/80 border-border hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setViewDialogOpen(true);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {ticket.description}
                        </CardDescription>
                        <div className="text-xs text-muted-foreground mt-2">
                          User: {ticket.profiles?.display_name || ticket.profiles?.full_name} ({ticket.profiles?.email})
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(ticket.status)}
                        <span className={`text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <DialogTitle>{selectedTicket.subject}</DialogTitle>
                    <DialogDescription>{selectedTicket.description}</DialogDescription>
                    <div className="text-sm text-muted-foreground mt-2">
                      From: {selectedTicket.profiles?.display_name || selectedTicket.profiles?.full_name} ({selectedTicket.profiles?.email})
                    </div>
                  </div>
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-3 max-h-[300px] overflow-y-auto p-2 border border-border rounded-lg">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`p-3 rounded-lg ${msg.is_admin_reply ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-medium">
                          {msg.is_admin_reply ? "You (Support)" : "User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Update Status</Label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="escalated">Escalated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newStatus === "escalated" && (
                      <div className="space-y-2">
                        <Label>Escalation Email</Label>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          value={escalationEmail}
                          onChange={(e) => setEscalationEmail(e.target.value)}
                          className="bg-background border-border"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Reply to User</Label>
                    <Textarea
                      placeholder="Type your reply... This will be sent to the user via email."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="bg-background border-border min-h-[120px]"
                    />
                  </div>

                  <Button 
                    onClick={sendReply} 
                    disabled={submitting || !replyMessage.trim()} 
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? "Sending..." : "Send Reply & Update Status"}
                  </Button>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => updateTicketStatus(selectedTicket.id, "resolved")}
                      className="flex-1"
                    >
                      Mark Resolved
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => updateTicketStatus(selectedTicket.id, "in_progress")}
                      className="flex-1"
                    >
                      Mark In Progress
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
