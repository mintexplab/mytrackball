import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Footer = () => {
  const [version, setVersion] = useState("1.16.0");
  const [footerText, setFooterText] = useState("© 2025 XZ1 Recording Ventures. All rights reserved");

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

    const fetchCustomFooter = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get current user's profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_subdistributor_master, subdistributor_footer_text, parent_account_id")
          .eq("id", user.id)
          .single();

        if (!profile) return;

        // Check if current user is subdistributor master
        if (profile.is_subdistributor_master && profile.subdistributor_footer_text) {
          setFooterText(profile.subdistributor_footer_text);
          return;
        }

        // Check if parent account is subdistributor master
        if (profile.parent_account_id) {
          const { data: parentProfile } = await supabase
            .from("profiles")
            .select("is_subdistributor_master, subdistributor_footer_text")
            .eq("id", profile.parent_account_id)
            .single();

          if (parentProfile?.is_subdistributor_master && parentProfile.subdistributor_footer_text) {
            setFooterText(parentProfile.subdistributor_footer_text);
          }
        }
      } catch (error) {
        console.error("Error fetching custom footer:", error);
      }
    };

    fetchVersion();
    fetchCustomFooter();

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
