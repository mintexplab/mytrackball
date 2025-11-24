import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, User, LogOut } from "lucide-react";
import { toast } from "sonner";

interface SavedAccount {
  email: string;
  lastUsed: string;
}

interface AccountSwitcherProps {
  currentUserEmail?: string;
}

export const AccountSwitcher = ({ currentUserEmail }: AccountSwitcherProps) => {
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedAccounts();
    
    // Add current account to saved accounts if it's not already there
    if (currentUserEmail) {
      addAccountToSaved(currentUserEmail);
    }
  }, [currentUserEmail]);

  const loadSavedAccounts = () => {
    const saved = localStorage.getItem("trackball_saved_accounts");
    if (saved) {
      try {
        const accounts = JSON.parse(saved) as SavedAccount[];
        setSavedAccounts(accounts);
      } catch (error) {
        console.error("Error loading saved accounts:", error);
        setSavedAccounts([]);
      }
    }
  };

  const addAccountToSaved = (email: string) => {
    const saved = localStorage.getItem("trackball_saved_accounts");
    let accounts: SavedAccount[] = [];
    
    if (saved) {
      try {
        accounts = JSON.parse(saved);
      } catch (error) {
        console.error("Error parsing saved accounts:", error);
      }
    }

    // Check if account already exists
    const existingIndex = accounts.findIndex(acc => acc.email === email);
    
    if (existingIndex >= 0) {
      // Update last used time
      accounts[existingIndex].lastUsed = new Date().toISOString();
    } else {
      // Add new account
      accounts.push({
        email,
        lastUsed: new Date().toISOString()
      });
    }

    // Sort by last used (most recent first)
    accounts.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());

    // Keep only last 5 accounts
    accounts = accounts.slice(0, 5);

    localStorage.setItem("trackball_saved_accounts", JSON.stringify(accounts));
    setSavedAccounts(accounts);
  };

  const removeAccount = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const saved = localStorage.getItem("trackball_saved_accounts");
    if (!saved) return;

    try {
      let accounts = JSON.parse(saved) as SavedAccount[];
      accounts = accounts.filter(acc => acc.email !== email);
      localStorage.setItem("trackball_saved_accounts", JSON.stringify(accounts));
      setSavedAccounts(accounts);
      toast.success("Account removed from list");
    } catch (error) {
      console.error("Error removing account:", error);
    }
  };

  const switchToAccount = async (email: string) => {
    // Set the email to auto-fill on login page
    localStorage.setItem("trackball_switch_email", email);
    
    // Mark this as an account switch (skip logout loader)
    sessionStorage.setItem("account_switching", "true");

    // Start fade out animation
    document.body.style.transition = "opacity 2s ease-out";
    document.body.style.opacity = "0";

    // Wait for fade out
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Sign out
    await supabase.auth.signOut();

    // Navigate to auth page (fade in will happen there)
    navigate("/auth");
  };

  const addNewAccount = async () => {
    // Clear any stored switch email
    localStorage.removeItem("trackball_switch_email");
    
    // Mark this as an account switch
    sessionStorage.setItem("account_switching", "true");

    // Start fade out animation
    document.body.style.transition = "opacity 2s ease-out";
    document.body.style.opacity = "0";

    // Wait for fade out
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Sign out
    await supabase.auth.signOut();

    // Navigate to auth page
    navigate("/auth");
  };

  const otherAccounts = savedAccounts.filter(acc => acc.email !== currentUserEmail);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 max-w-[200px] justify-start"
        >
          <User className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{currentUserEmail || "Account"}</span>
          <ChevronDown className="w-4 h-4 flex-shrink-0 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[280px] bg-card border-border z-50"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Current Account</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {currentUserEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        
        {otherAccounts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch to Account
            </DropdownMenuLabel>
            {otherAccounts.map((account) => (
              <DropdownMenuItem
                key={account.email}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => switchToAccount(account.email)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-sm">{account.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive/20"
                  onClick={(e) => removeAccount(account.email, e)}
                >
                  <LogOut className="w-3 h-3" />
                </Button>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={addNewAccount}
        >
          <Plus className="w-4 h-4 mr-2" />
          <span>Add Another Account</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
