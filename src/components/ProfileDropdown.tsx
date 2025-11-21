import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, CreditCard, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileDropdownProps {
  userEmail?: string;
  avatarUrl?: string;
  onSignOut: () => void;
}

export const ProfileDropdown = ({ userEmail, avatarUrl, onSignOut }: ProfileDropdownProps) => {
  const navigate = useNavigate();
  
  const initials = userEmail
    ? userEmail.substring(0, 2).toUpperCase()
    : "U";

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
            <p className="text-sm font-medium leading-none">My Account</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={() => window.open("https://trackball.cc/pricing", "_blank")}
          className="cursor-pointer"
        >
          <ArrowUp className="mr-2 h-4 w-4" />
          <span>Upgrade</span>
        </DropdownMenuItem>
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
        <DropdownMenuItem
          onClick={onSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
