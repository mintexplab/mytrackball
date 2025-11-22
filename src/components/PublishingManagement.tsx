import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Music, Eye } from "lucide-react";

const PublishingManagement = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("publishing_submissions")
      .select(`
        *,
        profiles!publishing_submissions_user_id_fkey(email, full_name, user_id)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load submissions");
      console.error(error);
      return;
    }

    setSubmissions(data || []);
    setLoading(false);
  };

  const updateStatus = async (submissionId: string, status: string) => {
    const { error } = await supabase
      .from("publishing_submissions")
      .update({ 
        status,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", submissionId);

    if (error) {
      toast.error("Failed to update status");
      console.error(error);
      return;
    }

    toast.success(`Status updated to "${status}"`);
    setAdminNotes("");
    fetchSubmissions();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      "sent to pro": "bg-blue-500/20 text-blue-300 border-blue-500/30",
      "declined for publishing": "bg-red-500/20 text-red-300 border-red-500/30",
    };

    return (
      <Badge variant="outline" className={colors[status] || colors.pending}>
        {status}
      </Badge>
    );
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
        <CardTitle className="text-2xl font-bold text-left">Publishing Submissions</CardTitle>
        <CardDescription className="text-left">Manage user publishing submissions</CardDescription>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No publishing submissions yet</p>
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-left">Song Title</TableHead>
                  <TableHead className="text-left">User</TableHead>
                  <TableHead className="text-left">Type</TableHead>
                  <TableHead className="text-left">Status</TableHead>
                  <TableHead className="text-left">Submitted</TableHead>
                  <TableHead className="text-left">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.song_title}</TableCell>
                    <TableCell>
                      {submission.profiles?.full_name || submission.profiles?.email || "Unknown"}
                      {submission.profiles?.user_id && (
                        <span className="text-xs text-muted-foreground block">
                          ID: {submission.profiles.user_id}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{submission.song_type}</TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>{new Date(submission.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setAdminNotes(submission.admin_notes || "");
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-left">{selectedSubmission?.song_title}</DialogTitle>
                            </DialogHeader>
                            {selectedSubmission && (
                              <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div>
                                    <Label className="text-muted-foreground">Song Type</Label>
                                    <p className="font-medium">{selectedSubmission.song_type}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Genre</Label>
                                    <p className="font-medium">{selectedSubmission.genre || "—"}</p>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-muted-foreground">ISRCs</Label>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {selectedSubmission.isrcs?.map((isrc: string, idx: number) => (
                                      <Badge key={idx} variant="secondary">{isrc}</Badge>
                                    ))}
                                  </div>
                                </div>

                                {selectedSubmission.alternate_titles?.length > 0 && (
                                  <div>
                                    <Label className="text-muted-foreground">Alternate Titles</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {selectedSubmission.alternate_titles.map((title: string, idx: number) => (
                                        <Badge key={idx} variant="secondary">{title}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {selectedSubmission.performers?.length > 0 && (
                                  <div>
                                    <Label className="text-muted-foreground">Performers</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {selectedSubmission.performers.map((performer: string, idx: number) => (
                                        <Badge key={idx} variant="secondary">{performer}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <Label className="text-muted-foreground">Content Flags</Label>
                                  <div className="space-y-1">
                                    {selectedSubmission.has_third_party_content && (
                                      <p className="text-sm">✓ Contains 3rd party content</p>
                                    )}
                                    {selectedSubmission.has_public_domain_content && (
                                      <p className="text-sm">✓ Contains public domain content</p>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-muted-foreground">Shareholders</Label>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-left">Name</TableHead>
                                        <TableHead className="text-left">Role</TableHead>
                                        <TableHead className="text-left">Share %</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedSubmission.shareholders?.map((s: any, idx: number) => (
                                        <TableRow key={idx}>
                                          <TableCell>{s.name}</TableCell>
                                          <TableCell>{s.role}</TableCell>
                                          <TableCell>{s.perf_share}%</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>

                                <div>
                                  <Label className="text-muted-foreground">Publishers</Label>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-left">Name</TableHead>
                                        <TableHead className="text-left">Role</TableHead>
                                        <TableHead className="text-left">Share %</TableHead>
                                        <TableHead className="text-left">PRO</TableHead>
                                        <TableHead className="text-left">IPI</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedSubmission.publishers?.map((p: any, idx: number) => (
                                        <TableRow key={idx}>
                                          <TableCell>{p.name}</TableCell>
                                          <TableCell>{p.role}</TableCell>
                                          <TableCell>{p.perf_share}%</TableCell>
                                          <TableCell>{p.pro || "—"}</TableCell>
                                          <TableCell>{p.ipi || "—"}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>

                                <div className="space-y-2 border-t pt-4">
                                  <Label htmlFor="admin_notes">Admin Notes</Label>
                                  <Textarea
                                    id="admin_notes"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add notes about this submission..."
                                    rows={3}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Update Status</Label>
                                  <Select
                                    value={selectedSubmission.status}
                                    onValueChange={(value) => updateStatus(selectedSubmission.id, value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="sent to pro">Sent to PRO</SelectItem>
                                      <SelectItem value="declined for publishing">Declined for Publishing</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Select
                          value={submission.status}
                          onValueChange={(value) => updateStatus(submission.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="sent to pro">Sent to PRO</SelectItem>
                            <SelectItem value="declined for publishing">Declined for Publishing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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

export default PublishingManagement;
