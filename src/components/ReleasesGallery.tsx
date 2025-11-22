import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Music } from "lucide-react";

interface ReleasesGalleryProps {
  userId?: string;
  onReleaseClick?: (releaseId: string) => void;
}

const ReleasesGallery = ({ userId, onReleaseClick }: ReleasesGalleryProps) => {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReleases();
  }, [userId]);

  const fetchReleases = async () => {
    let query = supabase
      .from("releases")
      .select("*")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load releases");
      return;
    }

    setReleases(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No releases yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {releases.map((release) => (
        <div
          key={release.id}
          onClick={() => {
            if (onReleaseClick) {
              onReleaseClick(release.id);
            } else {
              navigate(`/release/${release.id}`);
            }
          }}
          className="group cursor-pointer"
        >
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-3 shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:scale-105">
            {release.artwork_url ? (
              <img
                src={release.artwork_url}
                alt={release.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm line-clamp-1 text-left group-hover:text-primary transition-colors">
              {release.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1 text-left">
              {release.artist_name}
            </p>
            {release.release_date && (
              <p className="text-xs text-muted-foreground/70 text-left">
                {new Date(release.release_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReleasesGallery;
