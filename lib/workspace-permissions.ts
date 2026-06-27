import type { AuthProfile, WorkspacePermissions } from "@/types/auth";

export const defaultWorkspacePermissions: WorkspacePermissions = {
  canViewDashboard: false,
  canViewOperationalQueues: false,
  canViewLeads: false,
  canViewAllOperationalLeads: false,
  canClaimUnassignedLeads: false,
  canAssignLeadsToSelf: false,
  canReassignLeadsToOthers: false,
  canViewConversations: false,
  canViewAllOperationalConversations: false,
  canClaimUnassignedConversations: false,
  canAssignConversationsToSelf: false,
  canReassignConversationsToOthers: false,
  canViewAppointments: false,
  canViewAllOperationalAppointments: false,
  canClaimUnassignedAppointments: false,
  canAssignAppointmentsToSelf: false,
  canReassignAppointmentsToOthers: false,
  canViewNotifications: false,
  canManageOwnNotifications: false,
  canManageTeam: false,
  canInviteStaff: false,
  canRemoveStaff: false,
  canManageBusinessSettings: false,
  canManageBilling: false,
  canManageSubscription: false,
  canUseAi: false,
  canManageAiSettings: false,
};

const stringPermissionMap: Partial<Record<keyof WorkspacePermissions, string[]>> = {
  canViewDashboard: ["dashboard:view"],
  canViewOperationalQueues: ["operations:view"],
  canViewLeads: ["leads:view"],
  canViewConversations: ["conversations:view"],
  canViewAppointments: ["appointments:view"],
  canViewNotifications: ["notifications:view"],
  canManageOwnNotifications: ["notifications:manage-own"],
  canManageTeam: ["members:manage"],
  canInviteStaff: ["members:manage"],
  canRemoveStaff: ["members:manage"],
  canManageBusinessSettings: ["business:manage"],
  canManageBilling: ["subscription:manage"],
  canManageSubscription: ["subscription:manage"],
  canUseAi: ["ai:use"],
  canManageAiSettings: ["ai:manage"],
};

function roleFallbackPermissions(profile: AuthProfile): WorkspacePermissions {
  const role = profile.membership?.role;
  if (role === "BUSINESS_OWNER") {
    return {
      canViewDashboard: true,
      canViewOperationalQueues: true,
      canViewLeads: true,
      canViewAllOperationalLeads: true,
      canClaimUnassignedLeads: true,
      canAssignLeadsToSelf: true,
      canReassignLeadsToOthers: true,
      canViewConversations: true,
      canViewAllOperationalConversations: true,
      canClaimUnassignedConversations: true,
      canAssignConversationsToSelf: true,
      canReassignConversationsToOthers: true,
      canViewAppointments: true,
      canViewAllOperationalAppointments: true,
      canClaimUnassignedAppointments: true,
      canAssignAppointmentsToSelf: true,
      canReassignAppointmentsToOthers: true,
      canViewNotifications: true,
      canManageOwnNotifications: true,
      canManageTeam: true,
      canInviteStaff: true,
      canRemoveStaff: true,
      canManageBusinessSettings: true,
      canManageBilling: true,
      canManageSubscription: true,
      canUseAi: true,
      canManageAiSettings: true,
    };
  }

  if (role === "MANAGER") {
    return {
      ...defaultWorkspacePermissions,
      canViewDashboard: true,
      canViewOperationalQueues: true,
      canViewLeads: true,
      canViewAllOperationalLeads: true,
      canClaimUnassignedLeads: true,
      canAssignLeadsToSelf: true,
      canReassignLeadsToOthers: true,
      canViewConversations: true,
      canViewAllOperationalConversations: true,
      canClaimUnassignedConversations: true,
      canAssignConversationsToSelf: true,
      canReassignConversationsToOthers: true,
      canViewAppointments: true,
      canViewAllOperationalAppointments: true,
      canClaimUnassignedAppointments: true,
      canAssignAppointmentsToSelf: true,
      canReassignAppointmentsToOthers: true,
      canViewNotifications: true,
      canManageOwnNotifications: true,
      canManageTeam: true,
      canInviteStaff: true,
      canRemoveStaff: false,
      canManageBusinessSettings: true,
      canUseAi: true,
    };
  }

  if (role === "STAFF") {
    return {
      ...defaultWorkspacePermissions,
      canViewDashboard: true,
      canViewOperationalQueues: true,
      canViewLeads: true,
      canClaimUnassignedLeads: true,
      canAssignLeadsToSelf: true,
      canViewConversations: true,
      canClaimUnassignedConversations: true,
      canAssignConversationsToSelf: true,
      canViewAppointments: true,
      canClaimUnassignedAppointments: true,
      canAssignAppointmentsToSelf: true,
      canViewNotifications: true,
      canManageOwnNotifications: true,
    };
  }

  return defaultWorkspacePermissions;
}

export function getWorkspacePermissions(profile?: AuthProfile | null): WorkspacePermissions {
  const explicit = profile?.workspacePermissions;
  const permissions = profile ? { ...roleFallbackPermissions(profile), ...explicit } : { ...defaultWorkspacePermissions };

  if (profile?.permissions.length) {
    for (const [key, values] of Object.entries(stringPermissionMap) as Array<[keyof WorkspacePermissions, string[]]>) {
      if (values.some((value) => profile.permissions.includes(value))) permissions[key] = true;
    }
  }

  return permissions;
}

export function hasWorkspacePermission(profile: AuthProfile | null | undefined, permission: keyof WorkspacePermissions) {
  return getWorkspacePermissions(profile)[permission] === true;
}

export function canAccessOperationalPage(profile: AuthProfile | null | undefined, page: "leads" | "conversations" | "appointments") {
  const permissions = getWorkspacePermissions(profile);
  if (page === "leads") return permissions.canViewLeads || permissions.canViewOperationalQueues;
  if (page === "conversations") return permissions.canViewConversations || permissions.canViewOperationalQueues;
  return permissions.canViewAppointments || permissions.canViewOperationalQueues;
}

export function canManageBilling(profile: AuthProfile | null | undefined) {
  const permissions = getWorkspacePermissions(profile);
  return permissions.canManageBilling || permissions.canManageSubscription;
}

export function canManageBusinessSettings(profile: AuthProfile | null | undefined) {
  return getWorkspacePermissions(profile).canManageBusinessSettings;
}

export function canManageTeam(profile: AuthProfile | null | undefined) {
  const permissions = getWorkspacePermissions(profile);
  return permissions.canManageTeam || permissions.canInviteStaff || permissions.canRemoveStaff;
}
