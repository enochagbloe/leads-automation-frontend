"use client";

import { AlertTriangle } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { AppErrorState } from "@/components/app-error-state";
import { PlanBadge } from "@/components/subscription/plan-badge";
import { PlanCard } from "@/components/subscription/plan-card";
import { SubscriptionStatusBadge } from "@/components/subscription/subscription-status-badge";
import { UsageMeter } from "@/components/subscription/usage-meter";
import { LoadingCard } from "@/components/states/loading-states";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCurrentSubscription, usePlans } from "@/hooks/use-subscription";
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt";
import { ApiError } from "@/lib/api-client";
import { canCreateBusiness } from "@/lib/subscription";
import { PLAN_LIMIT_LABELS, PLANS } from "@/lib/subscription";
import type { PlanLimitKey } from "@/types/subscription";

const usageKeys: PlanLimitKey[] = ["staff", "services", "appointments", "conversations", "aiReplies", "knowledgeBaseItems"];

export function BillingPage() {
  const profile = useCurrentUser();
  const subscription = useCurrentSubscription();
  const plans = usePlans();
  const businessCreation = subscription.data ? canCreateBusiness(subscription.data) : null;
  const inactiveFromProfile = Boolean(profile.data && (!profile.data.subscription || !profile.data.plan));
  const subscriptionRequired = subscription.error instanceof ApiError && subscription.error.code === "SUBSCRIPTION_REQUIRED";

  if (profile.isPending || (subscription.isPending && !inactiveFromProfile)) return <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8"><LoadingCard /><div className="grid gap-4 lg:grid-cols-3"><LoadingCard /><LoadingCard /><LoadingCard /></div></main>;
  if (profile.isError) return <main className="mx-auto max-w-5xl p-5 sm:p-8"><AppErrorState title="Could not load your account" description="Your account details are temporarily unavailable." details={profile.error.message} onRetry={() => profile.refetch()} /></main>;
  if (subscription.isError && !subscriptionRequired && !inactiveFromProfile) return <main className="mx-auto max-w-5xl p-5 sm:p-8"><AppErrorState title="Could not load your subscription" description="Your plan details are temporarily unavailable." details={subscription.error.message} onRetry={() => subscription.refetch()} /></main>;
  if (!subscription.data || inactiveFromProfile || subscriptionRequired) {
    return (
      <main className="mx-auto max-w-7xl space-y-10 p-5 sm:p-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Settings</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Billing & plan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choose a plan to reactivate BizReply AI for this workspace.</p>
        </header>

        <AppCard className="border-warning/25 bg-warning/10 shadow-none">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warning/15 text-warning"><AlertTriangle className="size-5" /></span>
              <div>
                <h2 className="text-lg font-bold">Your subscription is inactive</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">You can still access your account, business profile, and billing settings, but subscription features are unavailable. Renew your subscription or select a plan to continue using BizReply AI.</p>
              </div>
            </div>
            <AppButton disabled className="shrink-0">Plan activation coming soon</AppButton>
          </div>
        </AppCard>

        <section>
          <div className="mb-5"><h2 className="text-xl font-bold tracking-tight">Choose a plan</h2><p className="mt-1 text-sm text-muted-foreground">Payment activation is not connected yet, but the workspace is ready for plan selection.</p></div>
          <div className="grid gap-5 lg:grid-cols-3">{(plans.data ?? PLANS).map((plan) => <PlanCard key={plan.code} plan={plan} />)}</div>
        </section>
      </main>
    );
  }
  const activeSubscription = subscription.data;

  return (
    <main className="mx-auto max-w-7xl space-y-10 p-5 sm:p-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Settings</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Billing & plan</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review your plan, current usage, and available upgrades. Payments and plan changes are not enabled yet.</p>
      </header>

      <AppCard>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div><p className="text-sm text-muted-foreground">{activeSubscription.account.name} workspace</p><div className="mt-2 flex items-center gap-3"><h2 className="text-xl font-bold">{activeSubscription.plan.name}</h2><PlanBadge plan={activeSubscription.plan.code} /></div><p className="mt-2 text-xs text-muted-foreground">One plan shared across all businesses in this workspace.</p></div>
          <div className="text-right"><p className="text-sm text-muted-foreground">Subscription status</p><div className="mt-2"><SubscriptionStatusBadge status={activeSubscription.status} /></div></div>
        </div>
        <div className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-2">
          <UsageMeter label="Businesses" value={activeSubscription.accountUsage.businesses} limit={activeSubscription.plan.limits.businesses} />
          {usageKeys.map((key) => <UsageMeter key={key} label={PLAN_LIMIT_LABELS[key]} value={activeSubscription.accountUsage[key]} limit={activeSubscription.plan.limits[key]} />)}
        </div>
        {businessCreation && !businessCreation.allowed && <UpgradePrompt className="mt-6" message={businessCreation.reason} recommendedPlan={businessCreation.recommendedPlan} />}
      </AppCard>

      <section>
        <div className="mb-5"><h2 className="text-xl font-bold tracking-tight">Compare plans</h2><p className="mt-1 text-sm text-muted-foreground">Upgrade actions are placeholders until payment integration is ready.</p></div>
        <div className="grid gap-5 lg:grid-cols-3">{(plans.data ?? PLANS).map((plan) => <PlanCard key={plan.code} plan={plan} current={plan.code === activeSubscription.plan.code} />)}</div>
      </section>
    </main>
  );
}
