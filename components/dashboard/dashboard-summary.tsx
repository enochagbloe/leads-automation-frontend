"use client";

import { BarChart3, Check, Minus } from "lucide-react";
import { AppCard } from "@/components/app-card";
import { AppErrorState } from "@/components/app-error-state";
import { PlanBadge } from "@/components/subscription/plan-badge";
import { SubscriptionStatusBadge } from "@/components/subscription/subscription-status-badge";
import { UsageMeter } from "@/components/subscription/usage-meter";
import { LoadingPage } from "@/components/states/loading-states";
import { useCurrentUser } from "@/hooks/use-auth";

export function DashboardSummary() {
  const profile = useCurrentUser();
  if (profile.isPending) return <LoadingPage />;
  if (profile.isError) return <AppErrorState />;
  const { account, accountUsage, activeBusiness, businessUsage, features, limits, membership, plan, subscription, permissions } = profile.data;
  if (!activeBusiness || !membership || !plan || !subscription) return <AppErrorState title="No active business" description="Select or join a business to continue." />;

  const featureRows = [
    ["Analytics", features.allowAnalytics],
    ["Branding removal", features.allowRemoveBranding],
    ["Priority support", features.allowPrioritySupport],
  ] as const;

  return <main className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">{account.name} · {accountUsage.businessesCount} {accountUsage.businessesCount === 1 ? "business" : "businesses"}</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Workspace overview</h1><p className="mt-2 text-sm text-muted-foreground">Viewing active-business activity for {activeBusiness.name}.</p></div><div className="flex items-center gap-2"><PlanBadge plan={plan.code} /><SubscriptionStatusBadge status={subscription.status} /></div></header>
    <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
      <AppCard><h2 className="font-bold">Workspace usage</h2><p className="mt-1 text-sm text-muted-foreground">Shared across every business under this account.</p><div className="mt-6 space-y-6"><UsageMeter label="Businesses" value={accountUsage.businessesCount} limit={limits.maxBusinesses} /><UsageMeter label="Staff" value={accountUsage.staffCount} limit={limits.maxStaff} /><UsageMeter label="Services" value={accountUsage.servicesCount} limit={limits.maxServices} /><UsageMeter label="Appointments / month" value={accountUsage.appointmentsUsed} limit={limits.maxAppointmentsPerMonth} /></div></AppCard>
      <AppCard><h2 className="font-bold">Business access</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-muted-foreground">Role</dt><dd className="mt-1 font-semibold">{membership.role.replaceAll("_", " ")}</dd></div><div><dt className="text-muted-foreground">Industry</dt><dd className="mt-1 font-semibold">{activeBusiness.industry}</dd></div><div><dt className="text-muted-foreground">Permissions</dt><dd className="mt-1 font-semibold">{permissions.length} enabled</dd></div></dl></AppCard>
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      <AppCard><div className="flex items-center gap-2"><BarChart3 className="size-4 text-primary" /><h2 className="font-bold">{activeBusiness.name} activity</h2></div><div className="mt-6 space-y-6"><UsageMeter label="Conversations / month" value={businessUsage.conversationsUsed} limit={limits.maxConversationsPerMonth} /><UsageMeter label="AI replies / month" value={businessUsage.aiRepliesUsed} limit={limits.maxAiRepliesPerMonth} /><UsageMeter label="Appointments / month" value={businessUsage.appointmentsUsed} limit={limits.maxAppointmentsPerMonth} /></div><p className="mt-5 text-xs text-muted-foreground">{businessUsage.leadsCreated} leads created in this business.</p></AppCard>
      <AppCard><h2 className="font-bold">Plan features</h2><ul className="mt-5 space-y-4">{featureRows.map(([label, enabled]) => <li key={label} className="flex items-center justify-between gap-4 text-sm"><span>{label}</span><span className={enabled ? "text-success" : "text-muted-foreground"}>{enabled ? <Check className="size-4" /> : <Minus className="size-4" />}</span></li>)}</ul></AppCard>
    </div>
  </main>;
}
