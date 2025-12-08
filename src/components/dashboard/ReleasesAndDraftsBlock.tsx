import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus, FileText, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Release {
  id: string;
  title: string;
  artist_name: string;
  status: string;
  created_at: string;
  artwork_url?: string;
}

interface Draft {
  id: string;
  formData: any;
  lastSaved: string;
  currentStep: number;
}

interface ReleasesAndDraftsBlockProps {
  userId?: string;
  onReleaseClick?: (id: string) => void;
}

export const ReleasesAndDraftsBlock = ({ userId, onReleaseClick }: ReleasesAndDraftsBlockProps) => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      fetchReleases();
    }
    loadDrafts();
  }, [userId]);

  const fetchReleases = async () => {
    const { data, error } = await supabase
      .from("releases")
      .select("id, title, artist_name, status, created_at, artwork_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error fetching releases:", error);
    } else {
      setReleases(data || []);
    }
    setLoading(false);
  };

  const loadDrafts = () => {
    const savedDraft = localStorage.getItem('release-draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setDrafts([
          {
            id: 'current',
            formData: draft.formData,
            lastSaved: draft.lastSaved,
            currentStep: draft.currentStep || 1,
          }
        ]);
      } catch (error) {
        console.error("Failed to load drafts:", error);
      }
    }
  };

  const handleDeleteDraft = (id: string) => {
    localStorage.removeItem('release-draft');
    setDrafts(drafts.filter(d => d.id !== id));
    toast.success("Draft deleted");
    setDeleteId(null);
  };

  const handleLoadDraft = () => {
    navigate('/create-release');
  };

  const getStatusDisplay = (status: string): { label: string; color: string } => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: "Pending Review", color: "text-yellow-400" },
      pending_payment: { label: "Awaiting Payment", color: "text-orange-400" },
      pay_later: { label: "Payment Pending", color: "text-amber-400" },
      approved: { label: "Approved", color: "text-green-400" },
      rejected: { label: "Rejected", color: "text-red-400" },
      delivering: { label: "Delivering", color: "text-blue-400" },
      delivered: { label: "Delivered", color: "text-teal-400" },
      "taken down": { label: "Taken Down", color: "text-gray-400" },
      striked: { label: "Striked", color: "text-orange-400" },
      "on hold": { label: "On Hold", color: "text-purple-400" },
      processing: { label: "Processing", color: "text-cyan-400" },
      published: { label: "Published", color: "text-blue-400" },
    };
    return statusMap[status] || { label: status.replace(/_/g, ' '), color: "text-muted-foreground" };
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20 min-h-[280px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </Card>
    );
  }

  return (
    <>
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20 min-h-[280px] flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-xl font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Releases & Drafts
            </CardTitle>
            <Button
              onClick={() => navigate('/create-release')}
              size="sm"
              className="bg-gradient-primary"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          <Tabs defaultValue="releases" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="releases">Releases</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="releases" className="space-y-2 mt-4">
              {releases.length === 0 ? (
                <div className="text-center py-6">
                  <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No releases yet</p>
                </div>
              ) : (
                releases.map((release) => (
                  <div
                    key={release.id}
                    onClick={() => onReleaseClick?.(release.id)}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer border border-border group"
                  >
                    <div className="flex items-center gap-3">
                      {release.artwork_url ? (
                        <img
                          src={release.artwork_url}
                          alt={release.title}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {release.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {release.artist_name}
                        </p>
                        <p className={`text-xs font-medium ${getStatusDisplay(release.status).color}`}>
                          {getStatusDisplay(release.status).label}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="drafts" className="space-y-2 mt-4">
              {drafts.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No saved drafts</p>
                </div>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-10 h-10 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {draft.formData?.songTitle || "Untitled Release"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {draft.formData?.artistName || "No artist"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(draft.lastSaved), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={handleLoadDraft}
                          size="sm"
                          className="bg-gradient-primary"
                        >
                          Continue
                        </Button>
                        <Button
                          onClick={() => setDeleteId(draft.id)}
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this draft. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteDraft(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
