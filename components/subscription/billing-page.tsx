"use client";

import { AppCard } from "@/components/app-card";
import { AppErrorState } from "@/components/app-error-state";
import { PlanBadge } from "@/components/subscription/plan-badge";
import { PlanCard } from "@/components/subscription/plan-card";
import { SubscriptionStatusBadge } from "@/components/subscription/subscription-status-badge";
import { UsageMeter } from "@/components/subscription/usage-meter";
import { LoadingCard } from "@/components/states/loading-states";
import { useCurrentSubscription, usePlans } from "@/hooks/use-subscription";
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt";
import { canCreateBusiness } from "@/lib/subscription";
import { PLAN_LIMIT_LABELS, PLANS } from "@/lib/subscription";
import type { PlanLimitKey } from "@/types/subscription";

const usageKeys: PlanLimitKey[] = ["staff", "services", "appointments", "conversations", "aiReplies", "knowledgeBaseItems"];

export function BillingPage() {
  const subscription = useCurrentSubscription();
  const plans = usePlans();
  const businessCreation = subscription.data ? canCreateBusiness(subscription.data) : null;

  if (subscription.isPending) return <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8"><LoadingCard /><div className="grid gap-4 lg:grid-cols-3"><LoadingCard /><LoadingCard /><LoadingCard /></div></main>;
  if (subscription.isError) return <main className="mx-auto max-w-5xl p-5 sm:p-8"><AppErrorState title="Could not load your subscription" description="Your plan details are temporarily unavailable." details={subscription.error.message} onRetry={() => subscription.refetch()} /></main>;

  return (
    <main className="mx-auto max-w-7xl space-y-10 p-5 sm:p-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Settings</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Billing & plan</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review your plan, current usage, and available upgrades. Payments and plan changes are not enabled yet.</p>
      </header>

      <AppCard>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div><p className="text-sm text-muted-foreground">{subscription.data.account.name} workspace</p><div className="mt-2 flex items-center gap-3"><h2 className="text-xl font-bold">{subscription.data.plan.name}</h2><PlanBadge plan={subscription.data.plan.code} /></div><p className="mt-2 text-xs text-muted-foreground">One plan shared across all businesses in this workspace.</p></div>
          <div className="text-right"><p className="text-sm text-muted-foreground">Subscription status</p><div className="mt-2"><SubscriptionStatusBadge status={subscription.data.status} /></div></div>
        </div>
        <div className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-2">
          <UsageMeter label="Businesses" value={subscription.data.accountUsage.businesses} limit={subscription.data.plan.limits.businesses} />
          {usageKeys.map((key) => <UsageMeter key={key} label={PLAN_LIMIT_LABELS[key]} value={subscription.data.accountUsage[key]} limit={subscription.data.plan.limits[key]} />)}
        </div>
        {businessCreation && !businessCreation.allowed && <UpgradePrompt className="mt-6" message={businessCreation.reason} recommendedPlan={businessCreation.recommendedPlan} />}
      </AppCard>

      <section>
        <div className="mb-5"><h2 className="text-xl font-bold tracking-tight">Compare plans</h2><p className="mt-1 text-sm text-muted-foreground">Upgrade actions are placeholders until payment integration is ready.</p></div>
        <div className="grid gap-5 lg:grid-cols-3">{(plans.data ?? PLANS).map((plan) => <PlanCard key={plan.code} plan={plan} current={plan.code === subscription.data.plan.code} />)}</div>
      </section>
    </main>
  );
}
