import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePreferredCurrency = () => {
  const [currency, setCurrency] = useState<string>("CAD");
  const [loading, setLoading] = useState(true);

  const fetchCurrency = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("preferred_currency")
        .eq("id", user.id)
        .single();

      if (data?.preferred_currency) {
        setCurrency(data.preferred_currency);
      }
    } catch (error) {
      console.error("Error fetching preferred currency:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrency();
  }, [fetchCurrency]);

  const updateCurrency = async (newCurrency: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ preferred_currency: newCurrency })
        .eq("id", user.id);

      if (error) throw error;
      setCurrency(newCurrency);
      return true;
    } catch (error) {
      console.error("Error updating currency:", error);
      return false;
    }
  };

  return {
    currency,
    loading,
    updateCurrency,
    refetch: fetchCurrency,
  };
};
