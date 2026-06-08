export type PlanCode = "BASIC" | "PLUS" | "PREMIUM";
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
export type AnalyticsAccess = "NONE" | "BASIC" | "ADVANCED";
export type PlanLimit = number | null;

export interface PlanLimits {
  businesses: PlanLimit;
  staff: PlanLimit;
  services: PlanLimit;
  appointments: PlanLimit;
  conversations: PlanLimit;
  aiReplies: PlanLimit;
  knowledgeBaseItems: PlanLimit;
}

export interface PlanFeatures {
  analytics: AnalyticsAccess;
  brandingRemoval: boolean;
  prioritySupport: boolean;
}

export interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  priceMonthly: number;
  currency: "GHS";
  limits: PlanLimits;
  features: PlanFeatures;
}

export interface UsageRecord {
  businesses: number;
  staff: number;
  services: number;
  appointments: number;
  conversations: number;
  aiReplies: number;
  knowledgeBaseItems: number;
  periodStart?: string;
  periodEnd?: string;
}

export interface BusinessUsageRecord {
  conversations: number;
  aiReplies: number;
  appointments: number;
  leadsCreated: number;
}

export interface WorkspaceAccount {
  id: string;
  name: string;
  ownerId: string;
}

export interface Subscription {
  id: string;
  account: WorkspaceAccount;
  status: SubscriptionStatus;
  plan: Plan;
  accountUsage: UsageRecord;
  businessUsage: BusinessUsageRecord;
  startsAt?: string;
  trialEndsAt?: string | null;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelledAt?: string | null;
}

export type PlanFeatureKey = keyof PlanFeatures;
export type PlanLimitKey = keyof PlanLimits;
