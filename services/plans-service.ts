import { apiRequest } from "@/lib/api-client";
import { PLAN_CATALOG } from "@/lib/subscription";
import type { Plan } from "@/types/subscription";

interface PlanApiResponse {
  id: string;
  code: Plan["code"];
  name: string;
  priceMonthly: string | number;
  currency: string;
  maxStaff: number | null;
  maxBusinesses?: number | null;
  maxServices: number | null;
  maxAppointmentsPerMonth: number | null;
  maxConversationsPerMonth: number | null;
  maxAiRepliesPerMonth: number | null;
  maxKnowledgeItems: number | null;
  allowAnalytics: boolean;
  allowRemoveBranding: boolean;
  allowPrioritySupport: boolean;
}

function normalizePlan(plan: PlanApiResponse): Plan {
  const catalogPlan = PLAN_CATALOG[plan.code];
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    priceMonthly: Number(plan.priceMonthly),
    currency: "GHS",
    limits: {
      businesses: plan.maxBusinesses ?? catalogPlan.limits.businesses,
      staff: plan.maxStaff,
      services: plan.maxServices,
      appointments: plan.maxAppointmentsPerMonth,
      conversations: plan.maxConversationsPerMonth,
      aiReplies: plan.maxAiRepliesPerMonth,
      knowledgeBaseItems: plan.maxKnowledgeItems,
    },
    features: {
      analytics: plan.allowAnalytics ? catalogPlan.features.analytics : "NONE",
      brandingRemoval: plan.allowRemoveBranding,
      prioritySupport: plan.allowPrioritySupport,
    },
  };
}

export const plansService = {
  list: async () => (await apiRequest<PlanApiResponse[]>("/plans")).map(normalizePlan),
};
