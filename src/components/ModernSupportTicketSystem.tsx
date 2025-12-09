import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, Plus, Send, Clock, CheckCircle2, AlertCircle, User, Headphones } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ticketSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  priority: z.enum(["low", "medium", "high"]),
  category: z.enum(["general", "technical", "billing", "account", "content"])
});

const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(2000)
});

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  user_id: string | null;
}

export const ModernSupportTicketSystem = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("general");
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
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

  const createTicket = async () => {
    try {
      const validated = ticketSchema.parse({ subject, description, priority, category });
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user profile for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, display_name")
        .eq("id", user.id)
        .single();

      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject: validated.subject,
          description: validated.description,
          priority: validated.priority,
          category: validated.category,
          status: "open"
        });

      if (error) throw error;

      // Send admin notification
      try {
        await supabase.functions.invoke("send-admin-notification", {
          body: {
            type: "new_ticket",
            title: "New Support Ticket",
            message: validated.description,
            userEmail: profile?.email || user.email,
            userName: profile?.full_name || profile?.display_name || "Unknown User",
            ticketSubject: validated.subject,
            additionalInfo: `Priority: ${validated.priority.toUpperCase()} | Category: ${validated.category}`
          }
        });
      } catch (notifError) {
        console.error("Failed to send admin notification:", notifError);
      }

      toast.success("Support ticket created successfully!");
      setDialogOpen(false);
      setSubject("");
      setDescription("");
      setPriority("medium");
      setCategory("general");
      fetchTickets();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error creating ticket:", error);
        toast.error("Failed to create ticket");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket) return;

    try {
      const validated = messageSchema.parse({ message: newMessage });
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: validated.message,
          is_admin_reply: false
        });

      if (error) throw error;

      setNewMessage("");
      fetchMessages(selectedTicket.id);
      toast.success("Message sent!");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      open: { color: "bg-blue-500", icon: Clock, label: "Open" },
      in_progress: { color: "bg-yellow-500", icon: MessageSquare, label: "In Progress" },
      resolved: { color: "bg-green-500", icon: CheckCircle2, label: "Resolved" },
      escalated: { color: "bg-red-500", icon: AlertCircle, label: "Escalated" }
    };
    return configs[status] || configs.open;
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      low: { color: "text-blue-400", label: "Low" },
      medium: { color: "text-yellow-400", label: "Medium" },
      high: { color: "text-red-400", label: "High" }
    };
    return configs[priority] || configs.medium;
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      general: "bg-gray-500",
      technical: "bg-blue-500",
      billing: "bg-green-500",
      account: "bg-purple-500",
      content: "bg-orange-500"
    };
    return (
      <Badge className={`${colors[category] || colors.general} text-white border-0 text-xs`}>
        {category}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Support Center</h2>
          <p className="text-muted-foreground mt-1">Get help with your account and releases</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Create Support Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="What do you need help with?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="low">Low - General inquiry</SelectItem>
                      <SelectItem value="medium">Medium - Need assistance</SelectItem>
                      <SelectItem value="high">High - Urgent issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide detailed information about your issue..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background border-border min-h-[150px] resize-none"
                />
              </div>
              <Button onClick={createTicket} disabled={submitting} className="w-full bg-gradient-primary hover:opacity-90">
                {submitting ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : tickets.length === 0 ? (
        <Card className="bg-card/50 border-border">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4">
              <Headphones className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tickets yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Create your first support ticket to get help</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tickets.map((ticket) => {
            const statusConfig = getStatusConfig(ticket.status);
            const priorityConfig = getPriorityConfig(ticket.priority);
            const StatusIcon = statusConfig.icon;

            return (
              <Card 
                key={ticket.id} 
                className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => {
                  setSelectedTicket(ticket);
                  setViewDialogOpen(true);
                }}
              >
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                          {ticket.subject}
                        </h3>
                        <Badge variant="outline" className={`${statusConfig.color} text-white border-0 flex items-center gap-1 shrink-0`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                        {getCategoryBadge(ticket.category)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </span>
                        <span className={`font-medium ${priorityConfig.color}`}>
                          {priorityConfig.label} Priority
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl mb-2">{selectedTicket.subject}</DialogTitle>
                    <div className="flex items-center gap-3 flex-wrap">
                      {(() => {
                        const statusConfig = getStatusConfig(selectedTicket.status);
                        const StatusIcon = statusConfig.icon;
                        return (
                          <Badge variant="outline" className={`${statusConfig.color} text-white border-0 flex items-center gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        );
                      })()}
                      {getCategoryBadge(selectedTicket.category)}
                      <Badge variant="outline" className={getPriorityConfig(selectedTicket.priority).color}>
                        {getPriorityConfig(selectedTicket.priority).label} Priority
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Ticket #{selectedTicket.id.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="space-y-4 max-h-[400px] overflow-y-auto px-1">
                  {/* Initial message */}
                  <div className="flex gap-3 flex-row-reverse">
                    <Avatar className="h-8 w-8 shrink-0 bg-muted">
                      <AvatarFallback className="text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 ml-8">
                      <div className="rounded-lg p-4 bg-muted">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">You</span>
                            <Badge variant="secondary" className="text-xs">INITIAL MESSAGE</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(selectedTicket.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.is_admin_reply ? 'flex-row' : 'flex-row-reverse'}`}>
                      <Avatar className={`h-8 w-8 shrink-0 ${msg.is_admin_reply ? 'bg-gradient-primary' : 'bg-muted'}`}>
                        <AvatarFallback className="text-xs">
                          {msg.is_admin_reply ? <Headphones className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 ${msg.is_admin_reply ? 'mr-8' : 'ml-8'}`}>
                        <div className={`rounded-lg p-4 ${msg.is_admin_reply ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold">
                              {msg.is_admin_reply ? "Support Team" : "You"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedTicket.status !== "resolved" && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Reply to this ticket</Label>
                      <Textarea
                        placeholder="Type your message here..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="bg-background border-border min-h-[100px] resize-none"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          You can also reply via email to contact@trackball.cc
                        </p>
                        <Button 
                          onClick={sendMessage} 
                          disabled={submitting || !newMessage.trim()} 
                          className="bg-gradient-primary hover:opacity-90"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {submitting ? "Sending..." : "Send"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {selectedTicket.status === "resolved" && (
                  <div className="text-center py-6 bg-muted/50 rounded-lg">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <p className="font-semibold mb-1">This ticket has been resolved</p>
                    <p className="text-sm text-muted-foreground">Reply via email to reopen if you need further assistance</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};