import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast-with-sound";
import { Plus, Trash2, Music, User } from "lucide-react";

interface ArtistName {
  id: string;
  name: string;
  isEditing: boolean;
}

interface ArtistNameManagementProps {
  maxArtistNames?: number;
}

export const ArtistNameManagement = ({ maxArtistNames = 3 }: ArtistNameManagementProps) => {
  const [artistNames, setArtistNames] = useState<ArtistName[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchArtistNames();
  }, []);

  const fetchArtistNames = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("artist_name")
        .eq("id", user.id)
        .single();

      // For now, we store artist names as comma-separated in the artist_name field
      // In a production app, you'd have a separate table
      if (profile?.artist_name) {
        const names = profile.artist_name.split(",").map((name: string, index: number) => ({
          id: `${index}`,
          name: name.trim(),
          isEditing: false,
        }));
        setArtistNames(names);
      }
    } catch (error) {
      console.error("Error fetching artist names:", error);
    }
  };

  const saveArtistNames = async (names: ArtistName[]) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const nameString = names.map(n => n.name).join(", ");

      const { error } = await supabase
        .from("profiles")
        .update({ artist_name: nameString })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Artist names saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save artist names");
    } finally {
      setLoading(false);
    }
  };

  const handleAddName = async () => {
    if (!newName.trim()) {
      toast.error("Please enter an artist name");
      return;
    }

    if (artistNames.length >= maxArtistNames) {
      toast.error(`Maximum ${maxArtistNames} artist names allowed`);
      return;
    }

    if (artistNames.some(n => n.name.toLowerCase() === newName.trim().toLowerCase())) {
      toast.error("This artist name already exists");
      return;
    }

    const newArtistName: ArtistName = {
      id: Date.now().toString(),
      name: newName.trim(),
      isEditing: false,
    };

    const updatedNames = [...artistNames, newArtistName];
    setArtistNames(updatedNames);
    setNewName("");
    await saveArtistNames(updatedNames);
  };

  const handleRemoveName = async (id: string) => {
    const updatedNames = artistNames.filter(n => n.id !== id);
    setArtistNames(updatedNames);
    await saveArtistNames(updatedNames);
  };

  const handleUpdateName = async (id: string, newValue: string) => {
    if (!newValue.trim()) {
      toast.error("Artist name cannot be empty");
      return;
    }

    const updatedNames = artistNames.map(n =>
      n.id === id ? { ...n, name: newValue.trim(), isEditing: false } : n
    );
    setArtistNames(updatedNames);
    await saveArtistNames(updatedNames);
  };

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Artist Names
        </CardTitle>
        <CardDescription>
          Manage up to {maxArtistNames} artist names you can release music under.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current artist names */}
        <div className="space-y-3">
          {artistNames.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/30 border border-border text-center">
              <Music className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No artist names added yet</p>
            </div>
          ) : (
            artistNames.map((artist) => (
              <div
                key={artist.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border"
              >
                <Music className="w-5 h-5 text-primary flex-shrink-0" />
                {artist.isEditing ? (
                  <Input
                    defaultValue={artist.name}
                    onBlur={(e) => handleUpdateName(artist.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateName(artist.id, e.currentTarget.value);
                      }
                    }}
                    autoFocus
                    className="flex-1"
                  />
                ) : (
                  <span
                    className="flex-1 cursor-pointer hover:text-primary transition-colors"
                    onClick={() =>
                      setArtistNames(artistNames.map(n =>
                        n.id === artist.id ? { ...n, isEditing: true } : n
                      ))
                    }
                  >
                    {artist.name}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveName(artist.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add new artist name */}
        {artistNames.length < maxArtistNames && (
          <div className="space-y-2">
            <Label>Add New Artist Name</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter artist name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddName();
                  }
                }}
                className="flex-1"
                disabled={loading}
              />
              <Button onClick={handleAddName} disabled={loading || !newName.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {artistNames.length}/{maxArtistNames} artist names used
            </p>
          </div>
        )}

        {artistNames.length >= maxArtistNames && (
          <p className="text-sm text-muted-foreground text-center">
            Maximum of {maxArtistNames} artist names reached
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ArtistNameManagement;
