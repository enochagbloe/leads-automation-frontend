import { ApiError, apiRequest } from "@/lib/api-client";
import { businessStore } from "@/lib/business-store";
import { env } from "@/lib/env";
import { tokenStore } from "@/lib/token-store";
import { mockAuthService } from "@/services/mock-auth-service";
import type { ApiMessage, AuthProfile, EmailInput, LoginInput, LoginResponse, RegisterInput, RegisterResponse, ResetPasswordInput, VerifyEmailInput, WorkspacePermissions } from "@/types/auth";

const EMPTY_ACCOUNT_USAGE = {
  businessesCount: 0,
  staffCount: 0,
  servicesCount: 0,
  appointmentsUsed: 0,
  conversationsUsed: 0,
  aiRepliesUsed: 0,
  knowledgeItemsCount: 0,
};

const EMPTY_BUSINESS_USAGE = {
  conversationsUsed: 0,
  aiRepliesUsed: 0,
  appointmentsUsed: 0,
  leadsCreated: 0,
};

const LOCKED_LIMITS = {
  maxBusinesses: 0,
  maxStaff: 0,
  maxServices: 0,
  maxAppointmentsPerMonth: 0,
  maxConversationsPerMonth: 0,
  maxAiRepliesPerMonth: 0,
  maxKnowledgeItems: 0,
};

const DISABLED_FEATURES = {
  allowAnalytics: false,
  allowRemoveBranding: false,
  allowPrioritySupport: false,
};

const permissionMap: Partial<Record<keyof WorkspacePermissions, string>> = {
  canViewDashboard: "dashboard:view",
  canViewOperationalQueues: "operations:view",
  canViewLeads: "leads:view",
  canViewConversations: "conversations:view",
  canViewAppointments: "appointments:view",
  canViewNotifications: "notifications:view",
  canManageOwnNotifications: "notifications:manage-own",
  canViewCustomerIssues: "customer-issues:view",
  canViewAllCustomerIssues: "customer-issues:view-all",
  canViewAssignedCustomerIssues: "customer-issues:view-assigned",
  canUpdateCustomerIssueStatus: "customer-issues:update-status",
  canManageTeam: "members:manage",
  canInviteStaff: "members:manage",
  canManageBusinessSettings: "business:manage",
  canManageBilling: "subscription:manage",
  canManageSubscription: "subscription:manage",
  canUseAi: "ai:use",
  canManageAiSettings: "ai:manage",
};

function normalizePermissions(
  permissions: AuthProfile["permissions"] | Partial<WorkspacePermissions> | undefined,
  fallbackWorkspacePermissions?: Partial<WorkspacePermissions>,
) {
  if (Array.isArray(permissions)) return { permissionList: permissions, workspacePermissions: undefined };
  const workspacePermissions = permissions ?? fallbackWorkspacePermissions;
  if (!workspacePermissions) return { permissionList: [], workspacePermissions: undefined };
  const permissionList = Object.entries(workspacePermissions)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => permissionMap[key as keyof WorkspacePermissions])
    .filter((value): value is string => Boolean(value));
  return { permissionList: Array.from(new Set(permissionList)), workspacePermissions };
}

function normalizeAuthProfile<T extends AuthProfile>(profile: T): T {
  const root = profile as T & {
    accountType?: AuthProfile["account"]["accountType"];
    canCreateBusiness?: boolean;
    permissions?: Partial<WorkspacePermissions> | string[];
    accountUsage?: AuthProfile["accountUsage"] | null;
    businessUsage?: AuthProfile["businessUsage"] | null;
    limits?: AuthProfile["limits"] | null;
    features?: AuthProfile["features"] | null;
  };
  const { permissionList, workspacePermissions } = normalizePermissions(root.permissions, profile.workspacePermissions);
  const accountType = root.account.accountType ?? root.accountType ?? (root.canCreateBusiness === false ? "STAFF_ONLY" : "OWNER_CAPABLE");
  const canCreateBusiness = root.account.canCreateBusiness ?? root.canCreateBusiness ?? accountType !== "STAFF_ONLY";
  const accountUsage = root.accountUsage ?? EMPTY_ACCOUNT_USAGE;

  return {
    ...profile,
    accountType,
    canCreateBusiness,
    account: { ...profile.account, accountType, canCreateBusiness },
    accountUsage,
    businessUsage: root.businessUsage ?? EMPTY_BUSINESS_USAGE,
    limits: root.limits ?? { ...LOCKED_LIMITS, maxBusinesses: accountUsage.businessesCount },
    features: root.features ?? DISABLED_FEATURES,
    permissions: permissionList,
    workspacePermissions: workspacePermissions ?? profile.workspacePermissions,
  };
}

export const authService = {
  async login(input: LoginInput) {
    const response = normalizeAuthProfile(env.useMockApi ? await mockAuthService.login(input) : await apiRequest<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) }));
    tokenStore.setTokens(response);
    if (response.activeBusiness) {
      const { businessStore } = await import("@/lib/business-store");
      businessStore.set(response.activeBusiness.id);
    }
    return response;
  },
  register: (input: RegisterInput) => env.useMockApi ? mockAuthService.register(input) : apiRequest<RegisterResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  async logout() {
    const refreshToken = tokenStore.getRefreshToken();
    try {
      return env.useMockApi ? await mockAuthService.logout() : await apiRequest<ApiMessage>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) });
    } finally {
      tokenStore.clear();
    }
  },
  verifyEmail: (input: VerifyEmailInput) => env.useMockApi ? mockAuthService.verifyEmail(input) : apiRequest<ApiMessage>("/auth/verify-email", { method: "POST", body: JSON.stringify(input) }),
  resendVerification: (input: EmailInput) => env.useMockApi ? mockAuthService.resendVerification(input) : apiRequest<ApiMessage>("/auth/resend-verification", { method: "POST", body: JSON.stringify(input) }),
  forgotPassword: (input: EmailInput) => env.useMockApi ? mockAuthService.forgotPassword(input) : apiRequest<ApiMessage>("/auth/forgot-password", { method: "POST", body: JSON.stringify(input) }),
  resetPassword: (input: ResetPasswordInput) => env.useMockApi ? mockAuthService.resetPassword(input) : apiRequest<ApiMessage>("/auth/reset-password", { method: "POST", body: JSON.stringify(input) }),
  async currentUser() {
    if (env.useMockApi) return normalizeAuthProfile(await mockAuthService.currentUser());
    try {
      return normalizeAuthProfile(await apiRequest<AuthProfile>("/auth/me"));
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "BUSINESS_ACCESS_DENIED") throw error;
      businessStore.clear();
      return normalizeAuthProfile(await apiRequest<AuthProfile>("/auth/me"));
    }
  },
};
