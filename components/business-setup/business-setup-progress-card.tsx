"use client";

import { ArrowRight, CheckCircle2, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { BusinessReadinessBadge } from "@/components/business-setup/business-readiness-badge";
import { BusinessSetupChecklist } from "@/components/business-setup/business-setup-checklist";
import { resolveSetupRoute } from "@/lib/business-setup";
import type { BusinessSetupStatus } from "@/types/business-setup";

export function BusinessSetupProgressCard({ status, canManage = true, onRemindLater }: { status: BusinessSetupStatus; canManage?: boolean; onRemindLater?: () => void }) {
  const next = resolveSetupRoute(status.nextRecommendedStep?.route);
  const title = !canManage ? "Business setup in progress" : status.readinessStatus === "NOT_STARTED" ? "Start your business setup" : status.readinessStatus === "READY_FOR_MANUAL_INBOX" ? "Your inbox is ready" : "Complete your business setup";
  const description = !canManage
    ? "An owner or manager is completing the remaining setup items. You can continue using the features available to your role."
    : status.readinessStatus === "READY_FOR_MANUAL_INBOX"
    ? "Complete your business details to prepare for future automation."
    : "BizReply needs your services, pricing, availability, and policies before automation can answer customers accurately.";
  return <AppCard className="overflow-hidden p-0"><div className={canManage ? "grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_.58fr]" : "p-5 sm:p-6"}><div><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><ClipboardCheck className="size-5" /></span><div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div></div><div className="mt-6 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Setup progress</p><p className="mt-1 text-3xl font-bold tabular-nums">{status.completionPercentage}%</p></div><BusinessReadinessBadge status={status.readinessStatus} /></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Business setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={status.completionPercentage}><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, status.completionPercentage))}%` }} /></div>{canManage && <div className="mt-5 flex flex-wrap gap-2">{next.available && next.href ? <AppButton asChild><Link href={next.href}>{status.readinessStatus === "NOT_STARTED" ? "Start setup" : "Continue setup"} <ArrowRight className="size-4" /></Link></AppButton> : <AppButton disabled title="The next setup form is coming in a later Sprint 5 module">{status.readinessStatus === "NOT_STARTED" ? "Start setup" : "Continue setup"} <span className="text-[10px]">(soon)</span></AppButton>}{onRemindLater && <AppButton variant="ghost" onClick={onRemindLater}>Remind me later</AppButton>}</div>}</div>{canManage && <div><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold">Next setup items</h3><span className="text-xs text-muted-foreground">{status.completedItems.length} completed</span></div><div className="mt-3"><BusinessSetupChecklist items={status.missingItems} limit={3} /></div>{status.missingItems.length === 0 && <div className="mt-3 flex items-center gap-2 rounded-xl border bg-success/5 p-4 text-sm font-semibold text-success"><CheckCircle2 className="size-4" />All setup items are complete.</div>}</div>}</div></AppCard>;
}
