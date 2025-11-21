import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface Collaborator {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface ReleaseCollaborator {
  id: string;
  release_id: string;
  collaborator_id: string;
  percentage: number;
  collaborator: Collaborator;
  release: {
    title: string;
    artist_name: string;
  };
}

export const CollaboratorsManagement = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRelease, setSelectedRelease] = useState("");
  const [percentage, setPercentage] = useState("");
  const [selectedCollaborator, setSelectedCollaborator] = useState("");

  // Fetch user's releases
  const { data: releases } = useQuery({
    queryKey: ["user-releases"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("releases")
        .select("id, title, artist_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch collaborators
  const { data: collaborators } = useQuery({
    queryKey: ["collaborators"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("collaborators")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Collaborator[];
    },
  });

  // Fetch release collaborators with details
  const { data: releaseCollaborators } = useQuery({
    queryKey: ["release-collaborators"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("release_collaborators")
        .select(`
          *,
          collaborator:collaborators(*),
          release:releases(title, artist_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ReleaseCollaborator[];
    },
  });

  // Create collaborator mutation
  const createCollaborator = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("collaborators")
        .insert({ user_id: user.id, name, email })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      toast.success("Collaborator added successfully");
      setName("");
      setEmail("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add collaborator");
    },
  });

  // Add collaborator to release mutation
  const addCollaboratorToRelease = useMutation({
    mutationFn: async () => {
      const percentageNum = parseFloat(percentage);
      
      // Check total percentage for this release
      const existingCollabs = releaseCollaborators?.filter(
        rc => rc.release_id === selectedRelease
      ) || [];
      
      const totalPercentage = existingCollabs.reduce(
        (sum, rc) => sum + parseFloat(rc.percentage.toString()), 0
      );

      if (totalPercentage + percentageNum > 100) {
        throw new Error(`Total percentage would exceed 100% (currently ${totalPercentage}%)`);
      }

      const { data, error } = await supabase
        .from("release_collaborators")
        .insert({
          release_id: selectedRelease,
          collaborator_id: selectedCollaborator,
          percentage: percentageNum,
        })
        .select()
        .single();

      if (error) throw error;

      // Get collaborator and release details for email
      const collab = collaborators?.find(c => c.id === selectedCollaborator);
      const release = releases?.find(r => r.id === selectedRelease);
      
      // Get current user info for inviter name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, full_name")
          .eq("id", user.id)
          .single();

        // Send notification email to collaborator
        if (collab && release) {
          try {
            await supabase.functions.invoke("send-collaborator-notification", {
              body: {
                collaboratorName: collab.name,
                collaboratorEmail: collab.email,
                inviterName: profile?.display_name || profile?.full_name || "A user",
                releaseTitle: `${release.title} - ${release.artist_name}`,
                percentage: percentageNum,
              },
            });
          } catch (emailError) {
            console.error("Failed to send collaborator email:", emailError);
            // Don't fail the operation if email fails
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["release-collaborators"] });
      toast.success("Collaborator added to release");
      setSelectedRelease("");
      setSelectedCollaborator("");
      setPercentage("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add collaborator to release");
    },
  });

  // Delete release collaborator mutation
  const deleteReleaseCollaborator = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("release_collaborators")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["release-collaborators"] });
      toast.success("Collaborator removed from release");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove collaborator");
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Collaborator</CardTitle>
          <CardDescription>
            Create a new collaborator to split royalties with
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Collaborator name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="collaborator@example.com"
              />
            </div>
            <Button
              onClick={() => createCollaborator.mutate()}
              disabled={!name || !email || createCollaborator.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Collaborator
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign Collaborator to Release</CardTitle>
          <CardDescription>
            Add a collaborator to a release with their royalty percentage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="release">Release</Label>
              <Select value={selectedRelease} onValueChange={setSelectedRelease}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a release" />
                </SelectTrigger>
                <SelectContent>
                  {releases?.map((release) => (
                    <SelectItem key={release.id} value={release.id}>
                      {release.title} - {release.artist_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="collaborator">Collaborator</Label>
              <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a collaborator" />
                </SelectTrigger>
                <SelectContent>
                  {collaborators?.map((collab) => (
                    <SelectItem key={collab.id} value={collab.id}>
                      {collab.name} ({collab.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="percentage">Royalty Percentage (%)</Label>
              <Input
                id="percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="e.g., 25"
              />
            </div>
            <Button
              onClick={() => addCollaboratorToRelease.mutate()}
              disabled={
                !selectedRelease ||
                !selectedCollaborator ||
                !percentage ||
                addCollaboratorToRelease.isPending
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Assign to Release
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Release Collaborators</CardTitle>
          <CardDescription>
            View and manage collaborators assigned to your releases
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!releaseCollaborators?.length ? (
            <p className="text-sm text-muted-foreground">
              No collaborators assigned to releases yet
            </p>
          ) : (
            <div className="space-y-4">
              {releaseCollaborators.map((rc) => (
                <div
                  key={rc.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{rc.collaborator.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {rc.release.title} - {rc.percentage}%
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteReleaseCollaborator.mutate(rc.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
