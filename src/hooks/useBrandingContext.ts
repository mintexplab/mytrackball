import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandingContextType {
  dashboardName: string;
  footerText: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  accentColor: string;
  loading: boolean;
}

export const BrandingContext = createContext<BrandingContextType>({
  dashboardName: "My Trackball",
  footerText: "© 2025 XZ1 Recording Ventures. All rights reserved.",
  logoUrl: null,
  bannerUrl: null,
  accentColor: "#ef4444",
  loading: true,
});

export const useBranding = () => useContext(BrandingContext);

export const useBrandingData = () => {
  const [branding, setBranding] = useState<BrandingContextType>({
    dashboardName: "My Trackball",
    footerText: "© 2025 XZ1 Recording Ventures. All rights reserved.",
    logoUrl: null,
    bannerUrl: null,
    accentColor: "#ef4444",
    loading: true,
  });

  useEffect(() => {
    fetchBranding();

    // Subscribe to profile changes for realtime updates
    const channel = supabase
      .channel("branding-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          fetchBranding();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBranding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBranding(prev => ({ ...prev, loading: false }));
        return;
      }

      // Get current user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_subdistributor_master, subdistributor_dashboard_name, subdistributor_footer_text, subdistributor_logo_url, subdistributor_banner_url, subdistributor_accent_color, parent_account_id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        setBranding(prev => ({ ...prev, loading: false }));
        return;
      }

      // Check if current user is subdistributor master
      if (profile.is_subdistributor_master) {
        setBranding({
          dashboardName: profile.subdistributor_dashboard_name || "My Trackball",
          footerText: profile.subdistributor_footer_text || "© 2025 XZ1 Recording Ventures. All rights reserved.",
          logoUrl: profile.subdistributor_logo_url,
          bannerUrl: profile.subdistributor_banner_url,
          accentColor: profile.subdistributor_accent_color || "#ef4444",
          loading: false,
        });
        return;
      }

      // Check if parent account is subdistributor master
      if (profile.parent_account_id) {
        const { data: parentProfile } = await supabase
          .from("profiles")
          .select("is_subdistributor_master, subdistributor_dashboard_name, subdistributor_footer_text, subdistributor_logo_url, subdistributor_banner_url, subdistributor_accent_color")
          .eq("id", profile.parent_account_id)
          .single();

        if (parentProfile?.is_subdistributor_master) {
          setBranding({
            dashboardName: parentProfile.subdistributor_dashboard_name || "My Trackball",
            footerText: parentProfile.subdistributor_footer_text || "© 2025 XZ1 Recording Ventures. All rights reserved.",
            logoUrl: parentProfile.subdistributor_logo_url,
            bannerUrl: parentProfile.subdistributor_banner_url,
            accentColor: parentProfile.subdistributor_accent_color || "#ef4444",
            loading: false,
          });
          return;
        }
      }

      // Default branding
      setBranding({
        dashboardName: "My Trackball",
        footerText: "© 2025 XZ1 Recording Ventures. All rights reserved.",
        logoUrl: null,
        bannerUrl: null,
        accentColor: "#ef4444",
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching branding:", error);
      setBranding(prev => ({ ...prev, loading: false }));
    }
  };

  return branding;
};
