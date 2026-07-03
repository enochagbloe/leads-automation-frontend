"use client";

import { CalendarCheck2, ShieldCheck } from "lucide-react";
import { systemNotify } from "@/lib/system-notifications";
import { AppCard } from "@/components/app-card";
import { AppErrorState } from "@/components/app-error-state";
import { AppointmentConfirmationSettings } from "@/components/calendar/appointment-confirmation-settings";
import { BusinessSetupTabs } from "@/components/business-setup/business-setup-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useAppointmentAutoConfirmSettings, useUpdateAppointmentAutoConfirmSettings } from "@/hooks/use-calendar-appointments";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { canManageBilling, getWorkspacePermissions } from "@/lib/workspace-permissions";

function settingsError(error: unknown) {
  if (!(error instanceof ApiError)) return getApiErrorMessage(error);
  const messages: Record<string, string> = {
    PLAN_UPGRADE_REQUIRED: error.message || "Upgrade to Premium to enable safe automatic appointment confirmation.",
    FORBIDDEN: "You do not have permission to update appointment settings.",
    VALIDATION_ERROR: error.message,
  };
  return messages[error.code] ?? error.message;
}

function AppointmentSettingsLoading() {
  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-3 h-4 w-[620px] max-w-full" />
      <Skeleton className="mt-6 h-12 rounded-xl" />
      <Skeleton className="mt-6 h-72 rounded-2xl" />
    </main>
  );
}

export function AppointmentSettingsPage() {
  const auth = useCurrentUser();
  const businessId = auth.data?.activeBusiness?.id;
  const plan = auth.data?.plan?.code ?? "BASIC";
  const settings = useAppointmentAutoConfirmSettings(businessId);
  const update = useUpdateAppointmentAutoConfirmSettings(businessId);
  const permissions = getWorkspacePermissions(auth.data);
  const canEdit = auth.data?.membership?.role === "BUSINESS_OWNER"
    || (auth.data?.membership?.role === "MANAGER" && (permissions.canManageAiSettings || permissions.canManageBusinessSettings));
  const billingAllowed = canManageBilling(auth.data);

  if (auth.isPending) return <AppointmentSettingsLoading />;
  if (!businessId) return <main className="p-6"><AppErrorState title="No active business" description="Select a business to manage appointment settings." /></main>;
  if (settings.isPending) return <AppointmentSettingsLoading />;

  const enabled = settings.data?.aiAutoConfirmAppointmentsEnabled ?? false;
  const changeEnabled = (aiAutoConfirmAppointmentsEnabled: boolean) => {
    if (!canEdit) {
      systemNotify.error("You do not have permission to update appointment settings.");
      return;
    }
    update.mutate({ aiAutoConfirmAppointmentsEnabled }, {
      onSuccess: () => {
        systemNotify.success(aiAutoConfirmAppointmentsEnabled ? "AI appointment auto-confirmation enabled." : "AI appointment auto-confirmation disabled.");
      },
      onError: (error) => systemNotify.error("Could not update appointment setting", { description: settingsError(error) }),
    });
  };

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Appointment settings</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
          Control how BizReply confirms appointment requests for this business.
        </p>
      </header>

      <BusinessSetupTabs activeKey="appointments" className="mt-5" />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <AppointmentConfirmationSettings
            plan={plan}
            enabled={enabled}
            loading={settings.isPending}
            error={settings.isError}
            updating={update.isPending}
            canManage={canEdit}
            canManageBilling={billingAllowed}
            onChange={changeEnabled}
          />
          {settings.isError && (
            <AppErrorState
              title="Could not load appointment settings"
              description={getApiErrorMessage(settings.error)}
              onRetry={() => void settings.refetch()}
            />
          )}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-20">
          <AppCard className="shadow-none">
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><CalendarCheck2 className="size-5" /></span>
              <div>
                <h2 className="text-sm font-bold">Current plan</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {plan === "PREMIUM" ? "Premium unlocks safe automatic appointment confirmation." : `${plan.charAt(0)}${plan.slice(1).toLowerCase()} keeps AI auto-confirmation locked.`}
                </p>
              </div>
            </div>
          </AppCard>
          <AppCard className="shadow-none">
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><ShieldCheck className="size-5" /></span>
              <div>
                <h2 className="text-sm font-bold">Backend decides safety</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  The frontend does not force appointment status. It shows Confirmed or Needs review exactly as the API returns it.
                </p>
              </div>
            </div>
          </AppCard>
        </aside>
      </div>
    </main>
  );
}
