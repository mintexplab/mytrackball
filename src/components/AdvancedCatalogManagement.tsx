import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, Music, Calendar, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReleaseInfoDialog from "./ReleaseInfoDialog";

interface AdvancedCatalogManagementProps {
  userId: string;
  selectedReleaseId?: string | null;
  onFloatingPlayer?: (src: string, title: string, artist: string) => void;
}

export const AdvancedCatalogManagement = ({ userId, selectedReleaseId, onFloatingPlayer }: AdvancedCatalogManagementProps) => {
  const [releases, setReleases] = useState<any[]>([]);
  const [filteredReleases, setFilteredReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");

  useEffect(() => {
    fetchReleases();
  }, [userId]);

  useEffect(() => {
    applyFilters();
  }, [releases, searchQuery, statusFilter, genreFilter]);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("releases")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReleases(data || []);
    } catch (error: any) {
      toast.error("Failed to load releases");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...releases];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (release) =>
          release.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          release.artist_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((release) => release.status === statusFilter);
    }

    // Genre filter
    if (genreFilter !== "all") {
      filtered = filtered.filter((release) => release.genre === genreFilter);
    }

    setFilteredReleases(filtered);
  };

  const exportToCsv = () => {
    const csvContent = [
      ["Title", "Artist", "Genre", "Release Date", "Status", "UPC", "ISRC"].join(","),
      ...filteredReleases.map((r) =>
        [
          r.title,
          r.artist_name,
          r.genre || "",
          r.release_date || "",
          r.status || "",
          r.upc || "",
          r.isrc || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalog-export.csv";
    a.click();
    toast.success("Catalog exported successfully");
  };

  const handleDeleteRelease = async (releaseId: string, releaseStatus?: string | null) => {
    if (releaseStatus === "pending") {
      toast.error("Cannot delete releases with pending status");
      return;
    }

    const deliveredStatuses = ["approved", "delivering"];
    if (releaseStatus && deliveredStatuses.includes(releaseStatus)) {
      toast.error(
        "Live releases must be taken down before deletion. Please request takedown from the release details page."
      );
      return;
    }

    if (!confirm("Are you sure you want to delete this release? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase.from("releases").delete().eq("id", releaseId);

    if (error) {
      toast.error("Failed to delete release");
      return;
    }

    toast.success("Release deleted successfully");
    fetchReleases();
  };
  const uniqueGenres = Array.from(new Set(releases.map((r) => r.genre).filter(Boolean)));

  useEffect(() => {
    if (selectedReleaseId) {
      const element = document.getElementById(`release-${selectedReleaseId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [selectedReleaseId]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or artist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="delivering">Delivering</SelectItem>
              </SelectContent>
            </Select>

            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {uniqueGenres.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredReleases.length} of {releases.length} releases
            </p>
            <Button onClick={exportToCsv} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Releases List */}
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredReleases.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No releases found</p>
          ) : (
            <div className="space-y-3">
              {filteredReleases.map((release) => (
                <div
                  key={release.id}
                  id={`release-${release.id}`}
                  className={`p-4 rounded-lg border transition-all ${
                    selectedReleaseId === release.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {release.artwork_url ? (
                      <img
                        src={release.artwork_url}
                        alt={release.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <Music className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base">{release.title}</h3>
                      <p className="text-sm text-muted-foreground">{release.artist_name}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {release.status && (
                          <Badge variant="outline" className="text-xs">
                            {release.status}
                          </Badge>
                        )}
                        {release.genre && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Tag className="w-3 h-3" />
                            {release.genre}
                          </Badge>
                        )}
                        {release.release_date && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(release.release_date).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                      <ReleaseInfoDialog releaseId={release.id} onFloatingPlayer={onFloatingPlayer} />
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 hover:bg-red-500/20 text-red-300"
                        onClick={() => handleDeleteRelease(release.id, release.status)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
