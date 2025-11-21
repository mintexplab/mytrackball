import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

interface Branding {
  name: string;
  primaryColor: string;
  backgroundColor: string;
  logoUrl?: string;
}

interface BrandingContextType {
  branding: Branding;
  isLoading: boolean;
}

const defaultBranding: Branding = {
  name: "Trackball Distribution",
  primaryColor: "#dc2626",
  backgroundColor: "#000000",
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  isLoading: false,
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [branding, setBranding] = useState<Branding>(defaultBranding);
  const location = useLocation();

  // Check if we're on a subdistributor route
  const subdistributorSlug = location.pathname.match(/^\/subdistributor\/([^/]+)/)?.[1];

  const { data: subdistributorBySlug } = useQuery({
    queryKey: ["subdistributor-by-slug", subdistributorSlug],
    queryFn: async () => {
      if (!subdistributorSlug) return null;

      const { data, error } = await supabase
        .from("subdistributors")
        .select("name, primary_color, background_color, logo_url")
        .eq("slug", subdistributorSlug)
        .eq("is_active", true)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!subdistributorSlug,
  });

  const { data: profile } = useQuery({
    queryKey: ["user-profile-branding"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("subdistributor_id")
        .eq("id", user.id)
        .single();

      if (error || !data?.subdistributor_id) return null;

      const { data: subdist, error: subdistError } = await supabase
        .from("subdistributors")
        .select("name, primary_color, background_color, logo_url")
        .eq("id", data.subdistributor_id)
        .single();

      if (subdistError) return null;
      return subdist;
    },
    enabled: !subdistributorSlug,
  });

  useEffect(() => {
    const brandingData = subdistributorBySlug || profile;
    
    if (brandingData) {
      const customBranding: Branding = {
        name: brandingData.name || defaultBranding.name,
        primaryColor: brandingData.primary_color || defaultBranding.primaryColor,
        backgroundColor: brandingData.background_color || defaultBranding.backgroundColor,
        logoUrl: brandingData.logo_url || undefined,
      };
      setBranding(customBranding);

      // Apply branding to CSS variables
      document.documentElement.style.setProperty(
        "--primary",
        hexToHSL(customBranding.primaryColor)
      );
      document.documentElement.style.setProperty(
        "--background",
        hexToHSL(customBranding.backgroundColor)
      );
    } else {
      setBranding(defaultBranding);
    }
  }, [profile, subdistributorBySlug]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading: false }}>
      {children}
    </BrandingContext.Provider>
  );
};

// Helper function to convert hex to HSL for CSS variables
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
