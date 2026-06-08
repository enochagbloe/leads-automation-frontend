import { apiRequest } from "@/lib/api-client";
import { env } from "@/lib/env";
import { PLAN_CATALOG } from "@/lib/subscription";
import { mockSubscriptionService } from "@/services/mock-subscription-service";
import type { ActivePlan, ApiLimits, ApiPlanFeatures, BusinessUsage } from "@/types/auth";
import type { PlanCode, Subscription, SubscriptionStatus } from "@/types/subscription";

interface SubscriptionApiResponse {
  account: { id: string; name: string; ownerId: string };
  businesses: unknown[];
  activeBusiness: unknown | null;
  id: string;
  plan: ActivePlan | PlanCode;
  status: SubscriptionStatus;
  accountUsage: {
    businessesCount: number;
    staffCount: number;
    servicesCount: number;
    appointmentsUsed: number;
    conversationsUsed: number;
    aiRepliesUsed: number;
    knowledgeItemsCount: number;
  };
  businessUsage: BusinessUsage;
  limits: ApiLimits;
  features: ApiPlanFeatures;
  startsAt?: string;
  trialEndsAt?: string | null;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelledAt?: string | null;
}

function normalizeSubscription(response: SubscriptionApiResponse): Subscription {
  const planCode = typeof response.plan === "string" ? response.plan : response.plan.code;
  const catalogPlan = PLAN_CATALOG[planCode];
  if (!catalogPlan) throw new Error(`Unsupported subscription plan returned by the API: ${String(planCode)}`);
  return {
    id: response.id,
    account: response.account,
    status: response.status,
    plan: {
      ...catalogPlan,
      limits: {
        businesses: response.limits.maxBusinesses ?? catalogPlan.limits.businesses,
        staff: response.limits.maxStaff,
        services: response.limits.maxServices,
        appointments: response.limits.maxAppointmentsPerMonth,
        conversations: response.limits.maxConversationsPerMonth,
        aiReplies: response.limits.maxAiRepliesPerMonth,
        knowledgeBaseItems: response.limits.maxKnowledgeItems,
      },
      features: {
        analytics: response.features.allowAnalytics ? catalogPlan.features.analytics : "NONE",
        brandingRemoval: response.features.allowRemoveBranding,
        prioritySupport: response.features.allowPrioritySupport,
      },
    },
    accountUsage: {
      businesses: response.accountUsage.businessesCount,
      staff: response.accountUsage.staffCount,
      services: response.accountUsage.servicesCount,
      appointments: response.accountUsage.appointmentsUsed,
      conversations: response.accountUsage.conversationsUsed,
      aiReplies: response.accountUsage.aiRepliesUsed,
      knowledgeBaseItems: response.accountUsage.knowledgeItemsCount,
    },
    businessUsage: {
      conversations: response.businessUsage.conversationsUsed,
      aiReplies: response.businessUsage.aiRepliesUsed,
      appointments: response.businessUsage.appointmentsUsed,
      leadsCreated: response.businessUsage.leadsCreated,
    },
    startsAt: response.startsAt,
    trialEndsAt: response.trialEndsAt,
    currentPeriodStart: response.currentPeriodStart,
    currentPeriodEnd: response.currentPeriodEnd,
    cancelledAt: response.cancelledAt,
  };
}

export const subscriptionService = {
  current: async () => env.useMockApi
    ? mockSubscriptionService.current()
    : normalizeSubscription(await apiRequest<SubscriptionApiResponse>("/subscription/current")),
};
