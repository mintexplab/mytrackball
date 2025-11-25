import { useMemo } from "react";

export interface PlanPermissions {
  // User management
  canAddUsers: boolean;
  maxUsers: number | null; // null = unlimited
  
  // Label management
  canCreateLabels: boolean;
  maxLabels: number | null; // null = unlimited
  canCustomizeLabels: boolean;
  maxUsersPerLabel: number | null;
  
  // Features
  canAccessPublishing: boolean;
  canAccessTickets: boolean;
  hasAccountManager: boolean;
  
  // Visual
  planDisplayName: string;
  planTier: "free" | "lite" | "signature" | "prestige" | "partner";
}

export const usePlanPermissions = (
  userPlan: any,
  profile: any
): PlanPermissions => {
  return useMemo(() => {
    const planName = userPlan?.plan?.name?.toLowerCase() || "";
    const labelType = profile?.label_type?.toLowerCase() || "";
    
    // Label plans take precedence over user plans
    const isLabelAccount = labelType.includes("label");
    
    // Label Free
    if (labelType === "label free") {
      return {
        canAddUsers: false,
        maxUsers: 1,
        canCreateLabels: true,
        maxLabels: 1,
        canCustomizeLabels: false,
        maxUsersPerLabel: 1,
        canAccessPublishing: false,
        canAccessTickets: false,
        hasAccountManager: false,
        planDisplayName: "Label Free",
        planTier: "free",
      };
    }
    
    // Label Lite
    if (labelType === "label lite") {
      return {
        canAddUsers: true,
        maxUsers: 2,
        canCreateLabels: true,
        maxLabels: 1,
        canCustomizeLabels: false,
        maxUsersPerLabel: 2,
        canAccessPublishing: false,
        canAccessTickets: false,
        hasAccountManager: false,
        planDisplayName: "Label Lite",
        planTier: "lite",
      };
    }
    
    // Label Signature
    if (labelType === "label signature") {
      return {
        canAddUsers: true,
        maxUsers: 2,
        canCreateLabels: true,
        maxLabels: 2,
        canCustomizeLabels: true,
        maxUsersPerLabel: 2,
        canAccessPublishing: false,
        canAccessTickets: true,
        hasAccountManager: true,
        planDisplayName: "Label Signature",
        planTier: "signature",
      };
    }
    
    // Label Prestige & Partner
    if (labelType === "label prestige" || labelType === "label partner") {
      return {
        canAddUsers: true,
        maxUsers: null, // unlimited
        canCreateLabels: true,
        maxLabels: null, // unlimited
        canCustomizeLabels: true,
        maxUsersPerLabel: null, // unlimited
        canAccessPublishing: true,
        canAccessTickets: true,
        hasAccountManager: true,
        planDisplayName: labelType === "label partner" ? "Label Partner" : "Label Prestige",
        planTier: labelType === "label partner" ? "partner" : "prestige",
      };
    }
    
    // Trackball Free
    if (planName === "trackball free") {
      return {
        canAddUsers: false,
        maxUsers: 1,
        canCreateLabels: false,
        maxLabels: 0,
        canCustomizeLabels: false,
        maxUsersPerLabel: 0,
        canAccessPublishing: false,
        canAccessTickets: false,
        hasAccountManager: false,
        planDisplayName: "Trackball Free",
        planTier: "free",
      };
    }
    
    // Trackball Lite
    if (planName === "trackball lite") {
      return {
        canAddUsers: false,
        maxUsers: 1,
        canCreateLabels: false,
        maxLabels: 0,
        canCustomizeLabels: false,
        maxUsersPerLabel: 0,
        canAccessPublishing: false,
        canAccessTickets: false,
        hasAccountManager: false,
        planDisplayName: "Trackball Lite",
        planTier: "lite",
      };
    }
    
    // Trackball Signature
    if (planName === "trackball signature") {
      return {
        canAddUsers: false,
        maxUsers: 1,
        canCreateLabels: false,
        maxLabels: 0,
        canCustomizeLabels: false,
        maxUsersPerLabel: 0,
        canAccessPublishing: false,
        canAccessTickets: true,
        hasAccountManager: true,
        planDisplayName: "Trackball Signature",
        planTier: "signature",
      };
    }
    
    // Trackball Prestige
    if (planName === "trackball prestige") {
      return {
        canAddUsers: true,
        maxUsers: 3,
        canCreateLabels: true,
        maxLabels: 1,
        canCustomizeLabels: false,
        maxUsersPerLabel: 1,
        canAccessPublishing: false,
        canAccessTickets: true,
        hasAccountManager: true,
        planDisplayName: "Trackball Prestige",
        planTier: "prestige",
      };
    }

    // Note: "Partner" only exists as "Label Partner" designation, not as an artist plan
    
    // Default/fallback (treat as free)
    return {
      canAddUsers: false,
      maxUsers: 1,
      canCreateLabels: false,
      maxLabels: 0,
      canCustomizeLabels: false,
      maxUsersPerLabel: 0,
      canAccessPublishing: false,
      canAccessTickets: false,
      hasAccountManager: false,
      planDisplayName: "Free Plan",
      planTier: "free",
    };
  }, [userPlan, profile]);
};
