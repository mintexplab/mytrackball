import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
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

interface Draft {
  id: string;
  formData: any;
  lastSaved: string;
  currentStep: number;
}

export const DraftManagement = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDrafts();
  }, []);

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

  if (drafts.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20 min-h-[280px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Saved Drafts</CardTitle>
          <CardDescription>Resume your release submissions</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">No saved drafts found</p>
            <p className="text-xs text-muted-foreground/70">
              Start a new release to create a draft
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20 min-h-[280px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Saved Drafts</CardTitle>
          <CardDescription>Resume your release submissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 flex-1">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {draft.formData?.songTitle || "Untitled Release"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {draft.formData?.artistName || "No artist"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Saved {formatDistanceToNow(new Date(draft.lastSaved), { addSuffix: true })}
                    </span>
                    <span className="text-xs text-muted-foreground">• Step {draft.currentStep}/6</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
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
