"use client";

import { useEffect, useState } from "react";
import { BusinessSetupProgressCard } from "@/components/business-setup/business-setup-progress-card";
import { BusinessSetupReminderDialog } from "@/components/business-setup/business-setup-reminder-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessSetupStatus } from "@/hooks/use-business-setup";

const DAY_MS = 86_400_000;

export function DashboardBusinessSetup({ businessId }: { businessId: string }) {
  const setup = useBusinessSetupStatus(businessId);
  const [reminderOpen, setReminderOpen] = useState(false);
  const storageKey = `bizreply_setup_reminder_dismissed_at_${businessId}`;

  useEffect(() => {
    if (!setup.data || setup.data.isAiReady || setup.data.completionPercentage >= 70) return;
    const dismissedAt = Number(localStorage.getItem(storageKey) ?? 0);
    if (Date.now() - dismissedAt < DAY_MS) return;
    const timer = window.setTimeout(() => setReminderOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [setup.data, storageKey]);

  if (setup.isPending) return <div className="rounded-2xl border bg-card p-6"><Skeleton className="h-5 w-52" /><Skeleton className="mt-4 h-3 w-full" /><Skeleton className="mt-5 h-24 w-full" /></div>;
  if (setup.isError) return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5"><div><p className="font-semibold">We could not load your business setup status.</p><p className="mt-1 text-sm text-muted-foreground">The rest of your dashboard is still available.</p></div><button type="button" className="text-sm font-semibold text-primary underline underline-offset-4" onClick={() => setup.refetch()}>Retry</button></div>;
  if (setup.data.isAiReady) return null;

  const remindLater = () => {
    localStorage.setItem(storageKey, String(Date.now()));
    setReminderOpen(false);
  };
  return <><BusinessSetupProgressCard status={setup.data} onRemindLater={remindLater} /><BusinessSetupReminderDialog open={reminderOpen} onOpenChange={(open) => open ? setReminderOpen(true) : remindLater()} status={setup.data} onRemindLater={remindLater} /></>;
}
