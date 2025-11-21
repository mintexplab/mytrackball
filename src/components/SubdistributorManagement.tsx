import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Subdistributor {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  background_color: string;
  owner_id: string | null;
  is_active: boolean;
  owner?: {
    email: string;
    full_name: string;
  };
}

export const SubdistributorManagement = () => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#dc2626");
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [ownerEmail, setOwnerEmail] = useState("");
  const queryClient = useQueryClient();

  const { data: subdistributors, isLoading } = useQuery({
    queryKey: ["subdistributors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subdistributors")
        .select(`
          *,
          owner:profiles!subdistributors_owner_id_fkey(email, full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Subdistributor[];
    },
  });


  const createSubdistributor = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data: subdist, error } = await supabase
        .from("subdistributors")
        .insert({
          name,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          primary_color: primaryColor,
          background_color: backgroundColor,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send invitation email if owner email provided
      if (ownerEmail && subdist) {
        const { error: inviteError } = await supabase.functions.invoke(
          "send-subdistributor-invitation",
          {
            body: {
              subdistributorId: subdist.id,
              subdistributorName: name,
              ownerEmail,
              primaryColor,
              backgroundColor,
            },
          }
        );

        if (inviteError) {
          console.error("Failed to send invitation:", inviteError);
          throw new Error("Subdistributor created but invitation email failed to send");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subdistributors"] });
      toast.success(ownerEmail 
        ? "Sub-distributor created and invitation sent" 
        : "Sub-distributor created successfully"
      );
      setName("");
      setSlug("");
      setPrimaryColor("#dc2626");
      setBackgroundColor("#000000");
      setOwnerEmail("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create sub-distributor");
    },
  });

  const deleteSubdistributor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subdistributors")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subdistributors"] });
      toast.success("Sub-distributor deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete sub-distributor");
    },
  });

  if (isLoading) {
    return <div className="text-center p-8">Loading sub-distributors...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Sub-Distributor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="XZ1 White Label"
            />
          </div>

          <div>
            <Label htmlFor="slug">Slug (URL-friendly identifier)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="xz1-white-label"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10 p-1"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#dc2626"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="backgroundColor">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-20 h-10 p-1"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="ownerEmail">Owner Email (Optional)</Label>
            <Input
              id="ownerEmail"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="owner@example.com"
            />
            <p className="text-sm text-muted-foreground mt-1">
              An invitation will be sent to this email
            </p>
          </div>

          <Button
            onClick={() => createSubdistributor.mutate()}
            disabled={!name || !slug || createSubdistributor.isPending}
            className="w-full"
          >
            {createSubdistributor.isPending ? "Creating..." : "Create Sub-Distributor"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Sub-Distributors</CardTitle>
        </CardHeader>
        <CardContent>
          {!subdistributors || subdistributors.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No sub-distributors created yet
            </p>
          ) : (
            <div className="space-y-4">
              {subdistributors.map((subdist) => (
                <div
                  key={subdist.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <h3 className="font-semibold">{subdist.name}</h3>
                    <p className="text-sm text-muted-foreground">Slug: {subdist.slug}</p>
                    <p className="text-sm text-muted-foreground">
                      Login URL: <code className="bg-muted px-1 rounded">/subdistributor/{subdist.slug}</code>
                    </p>
                    {subdist.owner && (
                      <p className="text-sm text-muted-foreground">
                        Owner: {subdist.owner.email}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: subdist.primary_color }}
                        title="Primary Color"
                      />
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: subdist.background_color }}
                        title="Background Color"
                      />
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Sub-Distributor</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{subdist.name}"? This action cannot be undone and will remove all associated branding and configuration.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSubdistributor.mutate(subdist.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
