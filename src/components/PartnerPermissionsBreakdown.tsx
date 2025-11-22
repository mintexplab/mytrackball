import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, History, Eye } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface PartnerAccount {
  id: string;
  display_name: string;
  email: string;
  label_name: string;
  user_id: string;
}

interface RoyaltySplit {
  royalty_split_percentage: number;
}

interface AuditLog {
  id: string;
  action_type: string;
  old_value: any;
  new_value: any;
  notes: string;
  created_at: string;
  admin_id: string;
  profiles: {
    display_name: string;
    email: string;
  };
}

const serviceLabels: Record<string, string> = {
  catalog: "Catalog Management",
  royalties: "Royalties",
  publishing: "Publishing",
  announcements: "Announcements",
  support: "Support",
  settings: "Settings"
};

export const PartnerPermissionsBreakdown = () => {
  const [partners, setPartners] = useState<PartnerAccount[]>([]);
  const [royaltySplits, setRoyaltySplits] = useState<Record<string, number>>({});
  const [serviceAccess, setServiceAccess] = useState<Record<string, string[]>>({});
  const [auditLogs, setAuditLogs] = useState<Record<string, AuditLog[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartnerAccounts();
  }, []);

  const fetchPartnerAccounts = async () => {
    try {
      // Get all partner accounts (users with Trackball Partner plan)
      const { data: partnerPlans } = await supabase
        .from("user_plans")
        .select("user_id, plan_name")
        .eq("plan_name", "Trackball Partner")
        .eq("status", "active");

      if (!partnerPlans || partnerPlans.length === 0) {
        setLoading(false);
        return;
      }

      const partnerUserIds = partnerPlans.map(p => p.user_id);

      // Get profile information for partners
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email, label_name, user_id")
        .in("id", partnerUserIds);

      if (profiles) {
        setPartners(profiles);

        // Fetch royalty splits
        const { data: splits } = await supabase
          .from("partner_royalty_splits")
          .select("user_id, royalty_split_percentage")
          .in("user_id", partnerUserIds);

        const splitsMap: Record<string, number> = {};
        splits?.forEach(split => {
          splitsMap[split.user_id] = split.royalty_split_percentage;
        });
        setRoyaltySplits(splitsMap);

        // Fetch service access from label invitations
        const { data: invitations } = await supabase
          .from("label_invitations")
          .select("master_account_email, service_access")
          .in("master_account_email", profiles.map(p => p.email))
          .eq("status", "accepted");

        const accessMap: Record<string, string[]> = {};
        invitations?.forEach(inv => {
          const profile = profiles.find(p => p.email === inv.master_account_email);
          if (profile && inv.service_access) {
            accessMap[profile.id] = inv.service_access;
          }
        });
        setServiceAccess(accessMap);

        // Fetch audit logs for each partner
        const { data: logs } = await supabase
          .from("partner_audit_log")
          .select(`
            id,
            user_id,
            action_type,
            old_value,
            new_value,
            notes,
            created_at,
            admin_id,
            profiles!partner_audit_log_admin_id_fkey (
              display_name,
              email
            )
          `)
          .in("user_id", partnerUserIds)
          .order("created_at", { ascending: false });

        const logsMap: Record<string, AuditLog[]> = {};
        logs?.forEach(log => {
          if (!logsMap[log.user_id]) {
            logsMap[log.user_id] = [];
          }
          logsMap[log.user_id].push(log as any);
        });
        setAuditLogs(logsMap);
      }
    } catch (error) {
      console.error("Error fetching partner accounts:", error);
      toast.error("Failed to load partner permissions");
    } finally {
      setLoading(false);
    }
  };

  const AuditLogDialog = ({ partnerId, partnerName }: { partnerId: string; partnerName: string }) => {
    const logs = auditLogs[partnerId] || [];

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <History className="w-4 h-4" />
            View History ({logs.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Audit Log - {partnerName}</DialogTitle>
            <DialogDescription>History of permission and royalty changes</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No changes recorded yet
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <Card key={log.id} className="bg-muted/30 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={log.action_type === "royalty_split_change" ? "default" : "secondary"}>
                          {log.action_type === "royalty_split_change" ? "Royalty Split" : "Service Access"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-muted-foreground">
                          Changed by: <span className="text-foreground">{log.profiles.display_name || log.profiles.email}</span>
                        </p>
                        {log.action_type === "royalty_split_change" && (
                          <p>
                            <span className="text-destructive">{log.old_value?.percentage || "N/A"}%</span>
                            {" → "}
                            <span className="text-green-500">{log.new_value?.percentage || "N/A"}%</span>
                          </p>
                        )}
                        {log.action_type === "service_access_change" && (
                          <div>
                            <p className="font-medium mb-1">Services changed:</p>
                            <div className="flex gap-2 flex-wrap">
                              {(log.new_value?.services || []).map((service: string) => (
                                <Badge key={service} variant="outline" className="text-xs">
                                  {serviceLabels[service] || service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.notes && (
                          <p className="text-muted-foreground italic mt-2">Note: {log.notes}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            PARTNER PERMISSIONS
          </CardTitle>
          <CardDescription>No partner accounts found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          PARTNER PERMISSIONS BREAKDOWN
        </CardTitle>
        <CardDescription>Detailed view of all partner account permissions and audit history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Partner</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Account ID</TableHead>
                <TableHead>Royalty Split</TableHead>
                <TableHead>Service Access</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => {
                const split = royaltySplits[partner.id];
                const services = serviceAccess[partner.id] || [];

                return (
                  <TableRow key={partner.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div>
                        <div className="font-medium">{partner.display_name}</div>
                        <div className="text-sm text-muted-foreground">{partner.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{partner.label_name || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">ID:{partner.user_id}</code>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-lg text-primary">
                        {split ? `${split}%` : "Not Set"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {services.length > 0 ? (
                          services.map((service) => (
                            <Badge key={service} variant="secondary" className="text-xs">
                              {serviceLabels[service] || service}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">All Services</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AuditLogDialog partnerId={partner.id} partnerName={partner.display_name || partner.email} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
