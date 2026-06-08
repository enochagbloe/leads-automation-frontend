import { EMPTY_USAGE, PLAN_CATALOG } from "@/lib/subscription";
import type { Subscription } from "@/types/subscription";

const now = new Date();

export const mockSubscriptionService = {
  async current(): Promise<Subscription> {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      id: "sub_demo",
      account: { id: "account_demo", name: "Amara Workspace", ownerId: "usr_demo" },
      status: "TRIALING",
      plan: PLAN_CATALOG.BASIC,
      accountUsage: { ...EMPTY_USAGE, businesses: 1, staff: 1, services: 3, appointments: 40, conversations: 120, aiReplies: 86, knowledgeBaseItems: 7 },
      businessUsage: { appointments: 40, conversations: 120, aiReplies: 86, leadsCreated: 12 },
      startsAt: now.toISOString(),
      trialEndsAt: new Date(now.getTime() + 14 * 86_400_000).toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
    };
  },
};
