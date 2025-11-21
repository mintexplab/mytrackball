import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";

interface CreateReleaseDialogProps {
  children: React.ReactNode;
}

const releaseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  artist_name: z.string().trim().min(1, "Artist name is required").max(200, "Artist name must be less than 200 characters"),
  release_date: z.string().optional(),
  genre: z.string().trim().max(100, "Genre must be less than 100 characters").optional(),
  notes: z.string().trim().max(2000, "Notes must be less than 2000 characters").optional(),
});

const CreateReleaseDialog = ({ children }: CreateReleaseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    artist_name: "",
    release_date: "",
    genre: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      const validatedData = releaseSchema.parse(formData);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("releases").insert({
        user_id: user.id,
        title: validatedData.title,
        artist_name: validatedData.artist_name,
        release_date: validatedData.release_date || null,
        genre: validatedData.genre || null,
        notes: validatedData.notes || null,
      });

      if (error) throw error;

      toast.success("Release submitted for review!");
      setOpen(false);
      setFormData({
        title: "",
        artist_name: "",
        release_date: "",
        genre: "",
        notes: "",
      });
      window.location.reload();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Release</DialogTitle>
          <DialogDescription>
            Submit your music for distribution. Our team will review it shortly.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Track/Album Title *</Label>
            <Input
              id="title"
              placeholder="My Awesome Track"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="bg-background/50 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artist_name">Artist Name *</Label>
            <Input
              id="artist_name"
              placeholder="DJ Example"
              value={formData.artist_name}
              onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })}
              required
              className="bg-background/50 border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="release_date">Release Date</Label>
              <Input
                id="release_date"
                type="date"
                value={formData.release_date}
                onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                className="bg-background/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Input
                id="genre"
                placeholder="Electronic, Hip-Hop, etc."
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="bg-background/50 border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements or information..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-background/50 border-border min-h-[100px]"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              {loading ? "Submitting..." : "Submit Release"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateReleaseDialog;
