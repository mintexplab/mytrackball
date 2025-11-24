import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Building2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LabelMembership {
  id: string;
  label_id: string;
  label_name: string;
  role: string;
  five_digit_label_id: string;
  accent_color: string | null;
}

interface LabelSwitcherDropdownProps {
  labelName?: string;
  labelDigitId?: string;
  parentAccount?: any;
}

export const LabelSwitcherDropdown = ({ labelName, labelDigitId, parentAccount }: LabelSwitcherDropdownProps) => {
  const [labelMemberships, setLabelMemberships] = useState<LabelMembership[]>([]);
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLabelMemberships();
  }, []);

  const fetchLabelMemberships = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, active_label_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setActiveLabelId(profile.active_label_id);
      }

      const { data: memberships } = await supabase
        .from("user_label_memberships")
        .select(`
          id, 
          label_id, 
          label_name, 
          role,
          labels!inner(label_id, accent_color)
        `)
        .eq("user_id", profile?.id || user.id)
        .order("joined_at", { ascending: true });

      if (memberships) {
        const mappedMemberships = memberships.map(m => ({
          id: m.id,
          label_id: m.label_id,
          label_name: m.label_name,
          role: m.role,
          five_digit_label_id: (m.labels as any).label_id,
          accent_color: (m.labels as any).accent_color,
        }));
        setLabelMemberships(mappedMemberships);
      }
    } catch (error) {
      console.error("Error fetching label memberships:", error);
    } finally {
      setLoading(false);
    }
  };

  const switchLabel = async (labelId: string, labelName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      document.body.style.transition = "opacity 0.3s ease-out";
      document.body.style.opacity = "0";

      const { error } = await supabase
        .from("profiles")
        .update({ active_label_id: labelId })
        .eq("id", user.id);

      if (error) throw error;

      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (error: any) {
      console.error("Error switching label:", error);
      toast.error(error.message || "Failed to switch label");
      document.body.style.opacity = "1";
    }
  };

  if (loading || labelMemberships.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none hidden lg:block">
        <div className="flex flex-col items-end text-right cursor-pointer hover:opacity-80 transition-opacity">
          <p className="text-sm font-medium text-foreground">
            {labelName || "Label Account"}
          </p>
          {labelDigitId && (
            <p className="text-xs text-muted-foreground">
              ID: {labelDigitId}
            </p>
          )}
          {parentAccount && (
            <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10 mt-1">
              Subaccount of {parentAccount.label_name || parentAccount.display_name || parentAccount.artist_name}
            </Badge>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-card border-border">
        {labelMemberships.length === 1 ? (
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">{labelMemberships[0].label_name}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span>ID: {labelMemberships[0].five_digit_label_id}</span>
                {labelMemberships[0].role === "owner" && (
                  <Badge variant="outline" className="text-xs">Owner</Badge>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
        ) : (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch Label Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {labelMemberships.map((membership) => (
              <DropdownMenuItem
                key={membership.id}
                onClick={() => switchLabel(membership.label_id, membership.label_name)}
                className="cursor-pointer flex items-center justify-between"
                style={membership.accent_color ? { borderLeft: `3px solid ${membership.accent_color}` } : undefined}
              >
                <div className="flex items-center">
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>{membership.label_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">ID: {membership.five_digit_label_id}</span>
                  {membership.role === "owner" && (
                    <Badge variant="outline" className="text-xs">Owner</Badge>
                  )}
                  {activeLabelId === membership.label_id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
