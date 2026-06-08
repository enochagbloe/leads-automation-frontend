import type { PlanCode, SubscriptionStatus } from "@/types/subscription";

export type UserRole = "PLATFORM_ADMIN" | "BUSINESS_OWNER" | "MANAGER" | "STAFF";
export type BusinessRole = "BUSINESS_OWNER" | "MANAGER" | "STAFF";
export type BusinessStatus = "ACTIVE" | "SUSPENDED" | "PENDING_SETUP";
export type UserStatus = "ACTIVE" | "DISABLED";
export type MembershipStatus = "ACTIVE" | "INVITED" | "DISABLED" | "REMOVED";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  status: UserStatus;
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  industry: string;
  slug: string;
  ownerId: string;
  email: string;
  phone: string | null;
  status: BusinessStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AccountUsage {
  businessesCount: number;
  staffCount: number;
  servicesCount: number;
  appointmentsUsed: number;
  conversationsUsed: number;
  aiRepliesUsed: number;
  knowledgeItemsCount: number;
}

export interface BusinessUsage {
  conversationsUsed: number;
  aiRepliesUsed: number;
  appointmentsUsed: number;
  leadsCreated: number;
}

export interface Account {
  id: string;
  name: string;
  ownerId: string;
}

export interface ApiLimits {
  maxBusinesses: number;
  maxStaff: number | null;
  maxServices: number | null;
  maxAppointmentsPerMonth: number | null;
  maxConversationsPerMonth: number | null;
  maxAiRepliesPerMonth: number | null;
  maxKnowledgeItems: number | null;
}

export interface ApiPlanFeatures {
  allowAnalytics: boolean;
  allowRemoveBranding: boolean;
  allowPrioritySupport: boolean;
}

export interface ProfileSubscription {
  id: string;
  status: SubscriptionStatus;
  startsAt: string;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface ActiveMembership {
  id: string;
  role: BusinessRole;
  status: MembershipStatus;
  joinedAt: string | null;
}

export interface ActivePlan {
  id: string;
  code: PlanCode;
  name: string;
  priceMonthly: string;
  currency: string;
  limits: ApiLimits;
  features: ApiPlanFeatures;
}

export interface AuthProfile {
  user: User;
  account: Account;
  businesses: Business[];
  activeBusiness: Business | null;
  membership: ActiveMembership | null;
  role: UserRole;
  subscription: ProfileSubscription | null;
  plan: ActivePlan | null;
  accountUsage: AccountUsage;
  businessUsage: BusinessUsage;
  limits: ApiLimits;
  features: ApiPlanFeatures;
  permissions: string[];
}

export interface LoginResponse extends AuthProfile { accessToken: string; refreshToken: string }
export interface RegisterResponse { user: User; business: Business; message: string }
export interface RefreshResponse { accessToken: string; refreshToken: string }
export interface BusinessMembership extends ActiveMembership { business: Business }
export interface BusinessInvitation { id: string; email: string; role: "MANAGER" | "STAFF"; status: string; expiresAt: string }
export interface InviteMemberInput { email: string; role: "MANAGER" | "STAFF" }
export interface InviteMemberResponse { invitation: BusinessInvitation; emailSent: boolean }
export interface AcceptInvitationInput { token: string; firstName?: string; lastName?: string; password?: string }

export interface ApiErrorResponse {
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    currentPlan?: PlanCode;
    recommendedPlan?: PlanCode;
    limit?: number;
    current?: number;
    featureKey?: keyof ApiPlanFeatures;
  };
  code?: string;
  message?: string;
  details?: Record<string, string[]>;
  currentPlan?: PlanCode;
  recommendedPlan?: PlanCode;
}

export interface ApiMessage { message: string }
export interface LoginInput { email: string; password: string }
export interface RegisterInput { firstName: string; lastName: string; businessName: string; industry: string; email: string; password: string }
export interface EmailInput { email: string }
export interface VerifyEmailInput { token: string }
export interface ResetPasswordInput { token: string; password: string }
