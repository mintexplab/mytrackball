import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Download, Music, Calendar, Tag, Trash2, Archive, AlertTriangle, X } from "lucide-react";
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
  const [selectedReleases, setSelectedReleases] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchReleases();
  }, [userId, showArchived]);

  useEffect(() => {
    applyFilters();
  }, [releases, searchQuery, statusFilter, genreFilter]);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("releases")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Filter archived/active releases
      if (showArchived) {
        query = query.not("archived_at", "is", null);
      } else {
        query = query.is("archived_at", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReleases(data || []);
      setSelectedReleases(new Set()); // Clear selection on refresh
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

  const exportToCsv = (selectedOnly: boolean = false) => {
    const releasesToExport = selectedOnly 
      ? filteredReleases.filter(r => selectedReleases.has(r.id))
      : filteredReleases;

    if (releasesToExport.length === 0) {
      toast.error("No releases to export");
      return;
    }

    const csvContent = [
      ["Title", "Artist", "Genre", "Release Date", "Status", "UPC", "ISRC"].join(","),
      ...releasesToExport.map((r) =>
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
    a.download = `catalog-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success(`Exported ${releasesToExport.length} release${releasesToExport.length === 1 ? '' : 's'}`);
  };

  const getDeleteMessage = (status: string | null, archived: boolean): string => {
    if (archived) {
      return "This release is already archived. Permanently delete it? This cannot be undone.";
    }
    
    switch (status) {
      case "pending":
        return "Cannot delete releases awaiting review. Please wait for admin approval or rejection.";
      case "approved":
      case "delivering":
        return "This release is live on streaming platforms. You must request a takedown before archiving.";
      case "rejected":
        return "Archive this rejected release? You can restore it later or permanently delete from the archive.";
      case "taken down":
        return "Archive this taken down release? You can restore it later or permanently delete from the archive.";
      default:
        return "Archive this release? You can restore it later or permanently delete from the archive.";
    }
  };

  const canArchive = (status: string | null): boolean => {
    return status !== "pending" && status !== "approved" && status !== "delivering";
  };

  const handleArchiveRelease = async (releaseId: string, releaseStatus?: string | null, isArchived?: boolean) => {
    if (!canArchive(releaseStatus) && !isArchived) {
      const message = getDeleteMessage(releaseStatus, false);
      toast.error(message);
      return;
    }

    const message = getDeleteMessage(releaseStatus, !!isArchived);
    
    if (isArchived) {
      // Permanent delete from archive
      if (!confirm(message)) return;
      
      const { error } = await supabase.from("releases").delete().eq("id", releaseId);
      
      if (error) {
        toast.error("Failed to delete release");
        return;
      }
      
      toast.success("Release permanently deleted");
    } else {
      // Move to archive (soft delete)
      if (!confirm(message)) return;
      
      const { error } = await supabase
        .from("releases")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", releaseId);
      
      if (error) {
        toast.error("Failed to archive release");
        return;
      }
      
      toast.success("Release archived. View in 'Archived Releases' to restore or permanently delete.");
    }
    
    fetchReleases();
  };

  const handleRestoreRelease = async (releaseId: string) => {
    if (!confirm("Restore this release from the archive?")) return;

    const { error } = await supabase
      .from("releases")
      .update({ archived_at: null })
      .eq("id", releaseId);

    if (error) {
      toast.error("Failed to restore release");
      return;
    }

    toast.success("Release restored successfully");
    fetchReleases();
  };

  const handleRequestTakedown = async (releaseId: string) => {
    if (!confirm("Request takedown for this release? This will notify the admin to remove it from streaming platforms.")) return;

    const { error } = await supabase
      .from("releases")
      .update({ takedown_requested: true })
      .eq("id", releaseId);

    if (error) {
      toast.error("Failed to request takedown");
      return;
    }

    toast.success("Takedown request submitted");
    fetchReleases();
  };

  const handleBulkArchive = async () => {
    const releasesToArchive = Array.from(selectedReleases);
    const releases = filteredReleases.filter(r => releasesToArchive.includes(r.id));
    
    // Check if any are not archivable
    const unarchivable = releases.filter(r => !canArchive(r.status) && !r.archived_at);
    if (unarchivable.length > 0) {
      toast.error(`${unarchivable.length} selected release(s) cannot be archived (pending/approved/delivering status)`);
      return;
    }

    if (!confirm(`Archive ${releasesToArchive.length} selected release(s)?`)) return;

    const { error } = await supabase
      .from("releases")
      .update({ archived_at: new Date().toISOString() })
      .in("id", releasesToArchive);

    if (error) {
      toast.error("Failed to archive releases");
      return;
    }

    toast.success(`${releasesToArchive.length} release(s) archived`);
    setSelectedReleases(new Set());
    fetchReleases();
  };

  const handleBulkTakedown = async () => {
    const releasesToTakedown = Array.from(selectedReleases);
    const releases = filteredReleases.filter(r => releasesToTakedown.includes(r.id));
    
    // Filter only approved/delivering releases that haven't requested takedown
    const eligibleReleases = releases.filter(
      r => (r.status === "approved" || r.status === "delivering") && !r.takedown_requested
    );

    if (eligibleReleases.length === 0) {
      toast.error("No eligible releases for takedown (must be approved/delivering and not already requested)");
      return;
    }

    if (!confirm(`Request takedown for ${eligibleReleases.length} selected release(s)?`)) return;

    const { error } = await supabase
      .from("releases")
      .update({ takedown_requested: true })
      .in("id", eligibleReleases.map(r => r.id));

    if (error) {
      toast.error("Failed to request takedowns");
      return;
    }

    toast.success(`Takedown requested for ${eligibleReleases.length} release(s)`);
    setSelectedReleases(new Set());
    fetchReleases();
  };

  const toggleSelectAll = () => {
    if (selectedReleases.size === filteredReleases.length) {
      setSelectedReleases(new Set());
    } else {
      setSelectedReleases(new Set(filteredReleases.map(r => r.id)));
    }
  };

  const toggleSelect = (releaseId: string) => {
    const newSelected = new Set(selectedReleases);
    if (newSelected.has(releaseId)) {
      newSelected.delete(releaseId);
    } else {
      newSelected.add(releaseId);
    }
    setSelectedReleases(newSelected);
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
      {/* Bulk Actions Bar */}
      {selectedReleases.size > 0 && (
        <Card className="backdrop-blur-sm bg-primary/10 border-primary/40">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedReleases.size} selected
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedReleases(new Set())}
                  className="h-8"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToCsv(true)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export Selected
                </Button>
                {!showArchived && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkTakedown}
                      className="border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-300"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Request Takedown
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkArchive}
                      className="border-red-500/30 hover:bg-red-500/20 text-red-300"
                    >
                      <Archive className="w-4 h-4 mr-1" />
                      Archive Selected
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <SelectItem value="taken down">Taken Down</SelectItem>
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
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {filteredReleases.length} of {releases.length} releases
              </p>
              <Button
                size="sm"
                variant={showArchived ? "default" : "outline"}
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="w-4 h-4 mr-1" />
                {showArchived ? "View Active" : "View Archived"}
              </Button>
            </div>
            <Button onClick={() => exportToCsv(false)} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Releases List */}
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {showArchived ? "Archived Releases" : "Catalog"}
            </CardTitle>
            {filteredReleases.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSelectAll}
              >
                {selectedReleases.size === filteredReleases.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredReleases.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              {showArchived ? "No archived releases" : "No releases found"}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredReleases.map((release) => (
                <div
                  key={release.id}
                  id={`release-${release.id}`}
                  className={`p-4 rounded-lg border transition-all ${
                    selectedReleaseId === release.id
                      ? "border-primary bg-primary/5"
                      : selectedReleases.has(release.id)
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedReleases.has(release.id)}
                      onCheckedChange={() => toggleSelect(release.id)}
                      className="mt-5"
                    />

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
                        {release.takedown_requested && (
                          <Badge variant="outline" className="text-xs bg-yellow-500/20 border-yellow-500/30">
                            Takedown Requested
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
                      
                      {showArchived ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500/30 hover:bg-green-500/20 text-green-300"
                            onClick={() => handleRestoreRelease(release.id)}
                          >
                            <Archive className="w-3 h-3 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 hover:bg-red-500/20 text-red-300"
                            onClick={() => handleArchiveRelease(release.id, release.status, true)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Permanent Delete
                          </Button>
                        </>
                      ) : (
                        <>
                          {(release.status === "approved" || release.status === "delivering") && !release.takedown_requested && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-300"
                              onClick={() => handleRequestTakedown(release.id)}
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Request Takedown
                            </Button>
                          )}
                          {canArchive(release.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 hover:bg-red-500/20 text-red-300"
                              onClick={() => handleArchiveRelease(release.id, release.status)}
                            >
                              <Archive className="w-3 h-3 mr-1" />
                              Archive
                            </Button>
                          )}
                        </>
                      )}
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