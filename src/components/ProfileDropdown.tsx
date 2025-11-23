import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, CreditCard, Building2, Check, Users2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileDropdownProps {
  userEmail?: string;
  avatarUrl?: string;
  artistName?: string;
  fullName?: string;
  onSignOut: () => void;
}

interface LabelMembership {
  id: string;
  label_id: string;
  label_name: string;
  role: string;
}

export const ProfileDropdown = ({ userEmail, avatarUrl, artistName, fullName, onSignOut }: ProfileDropdownProps) => {
  const navigate = useNavigate();
  const [labelMemberships, setLabelMemberships] = useState<LabelMembership[]>([]);
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : "U";

  useEffect(() => {
    fetchLabelMemberships();
  }, []);

  const fetchLabelMemberships = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's profile to see active label
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, active_label_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setActiveLabelId(profile.active_label_id);
      }

      // Get all label memberships
      const { data: memberships } = await supabase
        .from("user_label_memberships")
        .select("id, label_id, label_name, role")
        .eq("user_id", profile?.id || user.id)
        .order("joined_at", { ascending: true });

      if (memberships) {
        setLabelMemberships(memberships);
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      // Update active label
      const { error } = await supabase
        .from("profiles")
        .update({ 
          active_label_id: labelId,
          label_name: labelName 
        })
        .eq("id", profile.id);

      if (error) throw error;

      setActiveLabelId(labelId);
      toast.success(`Switched to ${labelName}`);
      
      // Refresh the page to update the dashboard context
      window.location.reload();
    } catch (error: any) {
      console.error("Error switching label:", error);
      toast.error(error.message || "Failed to switch label");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-border hover:ring-primary transition-all">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-gradient-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{fullName || "My Account"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={() => navigate("/subscription")}
          className="cursor-pointer"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Manage Subscription</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate("/settings")}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        
        <DropdownMenuSeparator className="bg-border" />
        
        {/* Label Switching Section */}
        {labelMemberships.length > 1 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch Label Account
            </DropdownMenuLabel>
            {labelMemberships.map((membership) => (
              <DropdownMenuItem
                key={membership.id}
                onClick={() => switchLabel(membership.label_id, membership.label_name)}
                className="cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>{membership.label_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {membership.role === "owner" && (
                    <Badge variant="outline" className="text-xs">Owner</Badge>
                  )}
                  {activeLabelId === membership.label_id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-border" />
          </>
        )}
        
        <DropdownMenuItem
          onClick={onSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log off {artistName || "Account"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
