import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LabelContext {
  activeLabelId: string | null;
  activeLabelName: string | null;
  loading: boolean;
  refreshContext: () => Promise<void>;
}

export const useLabelContext = (): LabelContext => {
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [activeLabelName, setActiveLabelName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLabelContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("active_label_id, label_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setActiveLabelId(profile.active_label_id);
        setActiveLabelName(profile.label_name);
      }
    } catch (error) {
      console.error("Error fetching label context:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabelContext();

    // Subscribe to changes in the profiles table
    const channel = supabase
      .channel("label-context-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          if (payload.new) {
            setActiveLabelId(payload.new.active_label_id);
            setActiveLabelName(payload.new.label_name);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refreshContext = async () => {
    await fetchLabelContext();
  };

  return {
    activeLabelId,
    activeLabelName,
    loading,
    refreshContext,
  };
};
