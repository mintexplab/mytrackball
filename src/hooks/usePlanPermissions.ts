import { useMemo } from "react";

export interface PlanPermissions {
  // User management
  canAddUsers: boolean;
  maxUsers: number | null; // null = unlimited
  
  // Label management
  canCreateLabels: boolean;
  maxLabels: number | null; // null = unlimited
  maxUsersPerLabel: number | null;
  
  // Features
  canAccessPublishing: boolean;
  canAccessTickets: boolean;
  hasAccountManager: boolean;
  
  // Artist-specific
  maxArtistNames: number | null; // null = unlimited
  
  // Visual
  planDisplayName: string;
  accountType: "artist" | "label";
}

export const usePlanPermissions = (
  userPlan: any,
  profile: any
): PlanPermissions => {
  return useMemo(() => {
    const accountType = profile?.account_type?.toLowerCase() || "";
    const isLabelAccount = accountType === "label";
    
    // Label accounts get full permissions
    if (isLabelAccount) {
      return {
        canAddUsers: true,
        maxUsers: null, // unlimited
        canCreateLabels: true,
        maxLabels: null, // unlimited
        maxUsersPerLabel: null, // unlimited
        canAccessPublishing: true,
        canAccessTickets: true,
        hasAccountManager: true,
        maxArtistNames: null, // unlimited
        planDisplayName: "Label Account",
        accountType: "label",
      };
    }
    
    // Artist accounts have limited permissions
    return {
      canAddUsers: false,
      maxUsers: 1,
      canCreateLabels: true,
      maxLabels: 1,
      maxUsersPerLabel: 0,
      canAccessPublishing: false,
      canAccessTickets: true,
      hasAccountManager: false,
      maxArtistNames: 3, // can have up to 3 artist names
      planDisplayName: "Artist Account",
      accountType: "artist",
    };
  }, [userPlan, profile]);
};
