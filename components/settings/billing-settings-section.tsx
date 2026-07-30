"use client";

import { ArrowUpRight, CreditCard, Download, FileText } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppErrorState } from "@/components/app-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsCard, SettingsPanel, SettingsSectionHeader, StatusPill } from "@/components/settings/settings-primitives";
import { useCurrentSubscription } from "@/hooks/use-subscription";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatPlanLimit, formatPlanPrice } from "@/lib/subscription";
import { getWorkspacePermissions } from "@/lib/workspace-permissions";
import type { AuthProfile } from "@/types/auth";

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(date);
}

export function BillingSettingsSection({ profile }: { profile: AuthProfile }) {
  const permissions = getWorkspacePermissions(profile);
  const canManageBilling = permissions.canManageBilling || permissions.canManageSubscription || profile.membership?.role === "BUSINESS_OWNER";
  const subscription = useCurrentSubscription(Boolean(profile.subscription && profile.plan));
  const currentPlan = subscription.data?.plan ?? null;

  return (
    <>
      <SettingsSectionHeader
        title="Billing"
        description="Review your workspace plan, usage, and billing status. Plan changes remain disabled until payment integration is enabled on the backend."
        action={<StatusPill tone={currentPlan ? "success" : "warning"}>{currentPlan ? "Subscription active" : "Subscription inactive"}</StatusPill>}
      />
      <SettingsPanel>
        {!canManageBilling && (
          <AppErrorState title="Billing access is limited" description="You do not have permission to manage billing for this workspace." />
        )}

        {subscription.isPending ? (
          <Skeleton className="h-72 rounded-none" />
        ) : subscription.isError ? (
          <AppErrorState title="Could not load billing" description={getApiErrorMessage(subscription.error)} onRetry={() => void subscription.refetch()} />
        ) : (
          <SettingsCard className="rounded-none border-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Current plan</p>
                  <h3 className="mt-2 font-sora text-3xl font-bold tracking-[-0.04em]">{currentPlan?.name ?? "No active plan"}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {currentPlan ? `${formatPlanPrice(currentPlan)} per month for ${profile.account.name}.` : "Your workspace can still access account and billing settings, but subscription features are unavailable."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={subscription.data?.status === "ACTIVE" || subscription.data?.status === "TRIALING" ? "success" : "warning"}>{subscription.data?.status ?? profile.subscription?.status ?? "Inactive"}</StatusPill>
                  {currentPlan && <StatusPill tone="primary">{currentPlan.code}</StatusPill>}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Current period</p>
                  <p className="mt-1 text-sm font-bold">{formatDate(subscription.data?.currentPeriodStart ?? profile.subscription?.currentPeriodStart)} - {formatDate(subscription.data?.currentPeriodEnd ?? profile.subscription?.currentPeriodEnd)}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Businesses</p>
                  <p className="mt-1 text-sm font-bold">{profile.accountUsage.businessesCount} / {formatPlanLimit(currentPlan?.limits.businesses ?? profile.limits.maxBusinesses)}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Staff seats</p>
                  <p className="mt-1 text-sm font-bold">{profile.accountUsage.staffCount} / {formatPlanLimit(currentPlan?.limits.staff ?? profile.limits.maxStaff)}</p>
                </div>
              </div>

              <div className="mt-6 border-t pt-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-primary" />
                  <h3 className="text-sm font-bold">Plan actions</h3>
                </div>
                <AppButton className="mt-4 w-full justify-between rounded-none sm:max-w-sm" disabled>
                  Upgrade or change plan <ArrowUpRight className="size-4" />
                </AppButton>
              </div>
          </SettingsCard>
        )}

        <SettingsCard className="border-0">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <h3 className="text-sm font-bold">Invoices and billing history</h3>
          </div>
          <div className="mt-4 rounded-xl bg-muted/35 p-5 text-center">
            <Download className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-bold">Invoice API not available yet</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Once the backend exposes invoice history, this table will show invoice number, period, amount, status, payment date, and downloads.</p>
          </div>
        </SettingsCard>
      </SettingsPanel>
    </>
  );
}
