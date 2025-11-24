import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/useBrandingContext";

const Footer = () => {
  const [version, setVersion] = useState("1.16.0");
  const { footerText } = useBranding();

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "version")
          .single();

        if (data) setVersion(data.setting_value);
      } catch (error) {
        console.error("Error fetching version:", error);
      }
    };

    fetchVersion();

    // Subscribe to version changes
    const channel = supabase
      .channel("version-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_settings",
          filter: "setting_key=eq.version",
        },
        (payload) => {
          if (payload.new && "setting_value" in payload.new) {
            setVersion(payload.new.setting_value as string);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <footer className="w-full border-t border-border bg-background py-4 px-6 mt-auto">
      <div className="relative">
        <div className="absolute left-0 top-0">
          <p className="text-xs text-muted-foreground/60">v{version}</p>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            {footerText}
          </p>
          <p className="text-sm text-muted-foreground">
            Need help? Shoot us an{" "}
            <a 
              href="mailto:contact@trackball.cc" 
              className="text-primary hover:underline transition-colors"
            >
              email
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
