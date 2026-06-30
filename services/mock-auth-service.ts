import type { ApiMessage, AuthProfile, EmailInput, LoginInput, LoginResponse, RegisterInput, RegisterResponse, ResetPasswordInput, VerifyEmailInput } from "@/types/auth";

const delay = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));
const now = new Date().toISOString();
const profile: AuthProfile = {
  user: { id: "usr_demo", firstName: "Amara", lastName: "Mensah", email: "demo@bizreply.ai", emailVerified: true, status: "ACTIVE", createdAt: now },
  account: { id: "account_demo", name: "Amara Workspace", ownerId: "usr_demo" },
  businesses: [{ id: "biz_demo", name: "Demo Business", industry: "Professional Services", slug: "demo-business", ownerId: "usr_demo", email: "demo@bizreply.ai", phone: null, status: "ACTIVE", createdAt: now, updatedAt: now, deletedAt: null }],
  activeBusiness: { id: "biz_demo", name: "Demo Business", industry: "Professional Services", slug: "demo-business", ownerId: "usr_demo", email: "demo@bizreply.ai", phone: null, status: "ACTIVE", createdAt: now, updatedAt: now, deletedAt: null },
  membership: { id: "member_demo", role: "BUSINESS_OWNER", status: "ACTIVE", joinedAt: now },
  role: "BUSINESS_OWNER",
  subscription: { id: "sub_demo", status: "TRIALING", startsAt: now, trialEndsAt: now, currentPeriodStart: now, currentPeriodEnd: now },
  plan: { id: "basic", code: "BASIC", name: "Basic", priceMonthly: "99", currency: "GHS", limits: { maxBusinesses: 1, maxStaff: 2, maxServices: 5, maxAppointmentsPerMonth: 100, maxConversationsPerMonth: 500, maxAiRepliesPerMonth: 500, maxKnowledgeItems: 20 }, features: { allowAnalytics: false, allowRemoveBranding: false, allowPrioritySupport: false } },
  accountUsage: { businessesCount: 1, staffCount: 1, servicesCount: 3, appointmentsUsed: 40, conversationsUsed: 120, aiRepliesUsed: 86, knowledgeItemsCount: 7 },
  businessUsage: { conversationsUsed: 120, aiRepliesUsed: 86, appointmentsUsed: 40, leadsCreated: 12 },
  limits: { maxBusinesses: 1, maxStaff: 2, maxServices: 5, maxAppointmentsPerMonth: 100, maxConversationsPerMonth: 500, maxAiRepliesPerMonth: 500, maxKnowledgeItems: 20 },
  features: { allowAnalytics: false, allowRemoveBranding: false, allowPrioritySupport: false },
  permissions: ["business:manage", "subscription:manage", "members:manage"],
  workspacePermissions: {
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
    canViewCustomerIssues: true,
    canViewAllCustomerIssues: true,
    canViewAssignedCustomerIssues: true,
    canUpdateCustomerIssueStatus: true,
    canManageTeam: true,
    canInviteStaff: true,
    canRemoveStaff: true,
    canManageBusinessSettings: true,
    canManageBilling: true,
    canManageSubscription: true,
    canUseAi: true,
    canManageAiSettings: true,
  },
};

export const mockAuthService = {
  async login(input: LoginInput): Promise<LoginResponse> {
    await delay();
    if (input.email.toLowerCase().includes("error")) throw new Error("We could not sign you in. Check your email and password.");
    return { ...profile, user: { ...profile.user, email: input.email }, accessToken: "mock-access-token", refreshToken: "mock-refresh-token" };
  },
  async register(input: RegisterInput): Promise<RegisterResponse> {
    await delay(900);
    if (input.email.toLowerCase().includes("error")) throw new Error("An account with this email already exists.");
    return { user: { ...profile.user, email: input.email, firstName: input.firstName, lastName: input.lastName, emailVerified: false }, business: { ...profile.activeBusiness!, name: input.businessName, industry: input.industry, email: input.email }, message: `A verification email was sent to ${input.email}.` };
  },
  async logout(): Promise<ApiMessage> { await delay(300); return { message: "Logged out successfully." }; },
  async verifyEmail(input: VerifyEmailInput): Promise<ApiMessage> { await delay(800); void input; return { message: "Email verified successfully" }; },
  async resendVerification(input: EmailInput): Promise<ApiMessage> { await delay(); return { message: `If ${input.email} is registered, a verification email has been sent.` }; },
  async forgotPassword(input: EmailInput): Promise<ApiMessage> { await delay(); return { message: `If an account exists for ${input.email}, a reset link is on its way.` }; },
  async resetPassword(input: ResetPasswordInput): Promise<ApiMessage> { await delay(850); void input; return { message: "Password reset successfully" }; },
  async currentUser(): Promise<AuthProfile> { await delay(350); return profile; },
};
