"use client";

import { ArrowRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/app-button";
import { BusinessReadinessBadge } from "@/components/business-setup/business-readiness-badge";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { resolveSetupRoute } from "@/lib/business-setup";
import type { BusinessSetupStatus } from "@/types/business-setup";

export function BusinessSetupReminderDialog({ open, onOpenChange, status, onRemindLater }: { open: boolean; onOpenChange: (open: boolean) => void; status: BusinessSetupStatus; onRemindLater: () => void }) {
  const next = resolveSetupRoute(status.nextRecommendedStep?.route);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogPortal><DialogOverlay /><DialogContent className="left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-[0_24px_80px_rgba(20,35,27,0.22)]"><span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary"><ClipboardCheck className="size-5" /></span><DialogTitle className="mt-5 text-xl font-bold">Finish setting up your business</DialogTitle><DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">BizReply needs your services, prices, availability, and policies before automation can respond accurately. You can still use the inbox manually while setup is incomplete.</DialogDescription><div className="mt-5 flex items-center justify-between gap-3 rounded-xl border bg-muted/25 p-4"><BusinessReadinessBadge status={status.readinessStatus} /><span className="text-lg font-bold tabular-nums">{status.completionPercentage}%</span></div><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><AppButton variant="ghost" onClick={onRemindLater}>Remind me later</AppButton>{next.available && next.href ? <AppButton asChild><Link href={next.href} onClick={() => onOpenChange(false)}>Continue setup <ArrowRight className="size-4" /></Link></AppButton> : <AppButton disabled title="The next setup form is coming in a later Sprint 5 module">Continue setup <span className="text-[10px]">(soon)</span></AppButton>}</div></DialogContent></DialogPortal></Dialog>;
}
