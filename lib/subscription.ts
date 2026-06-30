import type { Plan, PlanCode, PlanFeatureKey, PlanFeatures, PlanLimit, PlanLimitKey, UsageRecord } from "@/types/subscription";

export const PLAN_CATALOG: Record<PlanCode, Plan> = {
  BASIC: {
    id: "basic",
    code: "BASIC",
    name: "Basic",
    priceMonthly: 99,
    currency: "GHS",
    limits: { businesses: 1, staff: 2, services: 5, appointments: 100, conversations: 500, aiReplies: 500, knowledgeBaseItems: 20 },
    features: { analytics: "NONE", brandingRemoval: false, prioritySupport: false },
  },
  PLUS: {
    id: "plus",
    code: "PLUS",
    name: "Plus",
    priceMonthly: 199,
    currency: "GHS",
    limits: { businesses: 5, staff: 5, services: 20, appointments: 500, conversations: 3_000, aiReplies: 2_000, knowledgeBaseItems: 100 },
    features: { analytics: "BASIC", brandingRemoval: false, prioritySupport: false },
  },
  PREMIUM: {
    id: "premium",
    code: "PREMIUM",
    name: "Premium",
    priceMonthly: 399,
    currency: "GHS",
    limits: { businesses: 10, staff: null, services: null, appointments: null, conversations: 10_000, aiReplies: 10_000, knowledgeBaseItems: null },
    features: { analytics: "ADVANCED", brandingRemoval: true, prioritySupport: true },
  },
};

export const PLANS = Object.values(PLAN_CATALOG);
export const EMPTY_USAGE: UsageRecord = { businesses: 0, staff: 0, services: 0, appointments: 0, conversations: 0, aiReplies: 0, knowledgeBaseItems: 0 };
export const PLAN_LIMIT_LABELS: Record<PlanLimitKey, string> = {
  businesses: "Businesses",
  staff: "Staff",
  services: "Services",
  appointments: "Appointments / month",
  conversations: "Conversations / month",
  aiReplies: "AI replies / month",
  knowledgeBaseItems: "Knowledge base items",
};

export function formatPlanLimit(limit: PlanLimit) {
  return limit === null ? "Unlimited" : new Intl.NumberFormat("en-GH").format(limit);
}

export function formatPlanPrice(plan: Plan) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: plan.currency, maximumFractionDigits: 0 }).format(plan.priceMonthly);
}

export function hasPlanFeature(features: PlanFeatures, feature: PlanFeatureKey, minimumAnalytics: PlanFeatures["analytics"] = "BASIC") {
  if (feature !== "analytics") return features[feature];
  const levels = { NONE: 0, BASIC: 1, ADVANCED: 2 };
  return levels[features.analytics] >= levels[minimumAnalytics];
}

export function isAtPlanLimit(usage: UsageRecord, limits: Plan["limits"], key: PlanLimitKey) {
  return limits[key] !== null && usage[key] >= limits[key];
}

export function getRecommendedPlan(currentPlan: PlanCode): PlanCode | null {
  if (currentPlan === "BASIC") return "PLUS";
  if (currentPlan === "PLUS") return "PREMIUM";
  return null;
}

export function canCreateBusiness(subscription: Pick<import("@/types/subscription").Subscription, "plan" | "accountUsage">) {
  const limit = subscription.plan.limits.businesses;
  const allowed = limit === null || subscription.accountUsage.businesses < limit;
  if (allowed) return { allowed: true as const };
  const recommendedPlan = getRecommendedPlan(subscription.plan.code);
  return {
    allowed: false as const,
    reason: `Your ${subscription.plan.name} plan allows ${formatPlanLimit(limit)} ${limit === 1 ? "business" : "businesses"}. Upgrade to ${recommendedPlan ? PLAN_CATALOG[recommendedPlan].name : "a higher plan"} to add more businesses.`,
    recommendedPlan,
  };
}
