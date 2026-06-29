"use client";

import { AlertTriangle, BarChart3, CalendarDays, Check, Inbox, Minus, UsersRound } from "lucide-react";
import { AppCard } from "@/components/app-card";
import { AppErrorState } from "@/components/app-error-state";
import { DashboardBusinessSetup } from "@/components/business-setup/dashboard-business-setup";
import { PlanBadge } from "@/components/subscription/plan-badge";
import { SubscriptionStatusBadge } from "@/components/subscription/subscription-status-badge";
import { UsageMeter } from "@/components/subscription/usage-meter";
import { LoadingPage } from "@/components/states/loading-states";
import { useCurrentUser } from "@/hooks/use-auth";
import { WhatsAppDashboardWarning } from "@/components/whatsapp/whatsapp-dashboard-warning";
import { canManageBilling, canManageBusinessSettings, getWorkspacePermissions } from "@/lib/workspace-permissions";

export function DashboardSummary() {
  const profile = useCurrentUser();
  if (profile.isPending) return <LoadingPage />;
  if (profile.isError) return <AppErrorState />;
  const { account, accountUsage, activeBusiness, businessUsage, features, limits, membership, plan, subscription, permissions } = profile.data;
  if (!activeBusiness || !membership || !plan || !subscription) return <AppErrorState title="No active business" description="Select or join a business to continue." />;
  const workspacePermissions = getWorkspacePermissions(profile.data);
  if (!workspacePermissions.canViewDashboard) {
    return (
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center p-6">
        <AppErrorState
          title="You do not have permission to access this area."
          description="Switch workspace or ask an owner or manager to update your access."
        />
      </main>
    );
  }
  const showBillingContext = canManageBilling(profile.data);
  const canManageSetup = canManageBusinessSettings(profile.data);
  const conversationQuotaReached = limits.maxConversationsPerMonth !== null && accountUsage.conversationsUsed >= limits.maxConversationsPerMonth;

  const featureRows = [
    ["Analytics", features.allowAnalytics],
    ["Branding removal", features.allowRemoveBranding],
    ["Priority support", features.allowPrioritySupport],
  ] as const;

  return <main className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">{account.name} · {accountUsage.businessesCount} {accountUsage.businessesCount === 1 ? "business" : "businesses"}</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Workspace overview</h1><p className="mt-2 text-sm text-muted-foreground">Viewing active-business activity for {activeBusiness.name}.</p></div>{showBillingContext && <div className="flex items-center gap-2"><PlanBadge plan={plan.code} /><SubscriptionStatusBadge status={subscription.status} /></div>}</header>
    {conversationQuotaReached && (
      <AppCard className="border-warning/25 bg-warning/10 shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning"><AlertTriangle className="size-5" /></span>
            <div>
              <h2 className="font-bold text-warning">Conversation quota reached</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">You may have locked customer messages because your shared workspace conversation limit has been reached.</p>
            </div>
          </div>
          {showBillingContext && <a href="/settings/billing" className="inline-flex min-h-10 items-center justify-center rounded-lg border bg-card px-4 text-sm font-bold text-foreground hover:bg-muted">View Billing</a>}
        </div>
      </AppCard>
    )}
    <DashboardBusinessSetup businessId={activeBusiness.id} canManage={canManageSetup} />
    <WhatsAppDashboardWarning />
    {!showBillingContext && (
      <div className="grid gap-4 md:grid-cols-3">
        <AppCard><div className="flex items-center gap-2"><UsersRound className="size-4 text-primary" /><h2 className="font-bold">Leads queue</h2></div><p className="mt-3 text-sm text-muted-foreground">{workspacePermissions.canClaimUnassignedLeads ? "You can work assigned and unassigned leads." : "You can view leads available to your role."}</p></AppCard>
        <AppCard><div className="flex items-center gap-2"><Inbox className="size-4 text-primary" /><h2 className="font-bold">Inbox queue</h2></div><p className="mt-3 text-sm text-muted-foreground">{workspacePermissions.canClaimUnassignedConversations ? "You can take unassigned conversations that need attention." : "You can view conversations available to your role."}</p></AppCard>
        <AppCard><div className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /><h2 className="font-bold">Appointments</h2></div><p className="mt-3 text-sm text-muted-foreground">{workspacePermissions.canClaimUnassignedAppointments ? "You can take open appointment work." : "You can view appointments available to your role."}</p></AppCard>
      </div>
    )}
    {showBillingContext && (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
      <AppCard><h2 className="font-bold">Workspace usage</h2><p className="mt-1 text-sm text-muted-foreground">Shared across every business under this account.</p><div className="mt-6 space-y-6"><UsageMeter label="Businesses" value={accountUsage.businessesCount} limit={limits.maxBusinesses} /><UsageMeter label="Staff" value={accountUsage.staffCount} limit={limits.maxStaff} /><UsageMeter label="Services" value={accountUsage.servicesCount} limit={limits.maxServices} /><UsageMeter label="Appointments / month" value={accountUsage.appointmentsUsed} limit={limits.maxAppointmentsPerMonth} /></div></AppCard>
      <AppCard><h2 className="font-bold">Business access</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-muted-foreground">Role</dt><dd className="mt-1 font-semibold">{membership.role.replaceAll("_", " ")}</dd></div><div><dt className="text-muted-foreground">Industry</dt><dd className="mt-1 font-semibold">{activeBusiness.industry}</dd></div><div><dt className="text-muted-foreground">Permissions</dt><dd className="mt-1 font-semibold">{permissions.length} enabled</dd></div></dl></AppCard>
    </div>
    )}
    <div className="grid gap-5 md:grid-cols-2">
      <AppCard><div className="flex items-center gap-2"><BarChart3 className="size-4 text-primary" /><h2 className="font-bold">{activeBusiness.name} activity</h2></div><div className="mt-6 space-y-6"><UsageMeter label="Conversations / month" value={businessUsage.conversationsUsed} limit={limits.maxConversationsPerMonth} /><UsageMeter label="AI replies / month" value={businessUsage.aiRepliesUsed} limit={limits.maxAiRepliesPerMonth} /><UsageMeter label="Appointments / month" value={businessUsage.appointmentsUsed} limit={limits.maxAppointmentsPerMonth} /></div><p className="mt-5 text-xs text-muted-foreground">{businessUsage.leadsCreated} leads created in this business.</p></AppCard>
      {showBillingContext ? <AppCard><h2 className="font-bold">Plan features</h2><ul className="mt-5 space-y-4">{featureRows.map(([label, enabled]) => <li key={label} className="flex items-center justify-between gap-4 text-sm"><span>{label}</span><span className={enabled ? "text-success" : "text-muted-foreground"}>{enabled ? <Check className="size-4" /> : <Minus className="size-4" />}</span></li>)}</ul></AppCard> : <AppCard><h2 className="font-bold">Business access</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-muted-foreground">Role</dt><dd className="mt-1 font-semibold">{membership.role.replaceAll("_", " ")}</dd></div><div><dt className="text-muted-foreground">Position</dt><dd className="mt-1 font-semibold">{membership.positionTitle ?? "Team member"}</dd></div><div><dt className="text-muted-foreground">Permissions</dt><dd className="mt-1 font-semibold">{permissions.length} enabled</dd></div></dl></AppCard>}
    </div>
  </main>;
}
