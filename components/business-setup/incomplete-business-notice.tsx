import { ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/app-button";
import { resolveSetupRoute } from "@/lib/business-setup";
import type { BusinessSetupStatus } from "@/types/business-setup";

export function IncompleteBusinessNotice({ status, canManage }: { status: BusinessSetupStatus; canManage: boolean }) {
  if (status.isAiReady) return null;
  const next = resolveSetupRoute(status.nextRecommendedStep?.route);
  return <aside className="flex shrink-0 flex-col gap-3 border-b bg-secondary/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Business setup notice"><div className="flex gap-2.5"><Info className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-xs font-bold">Business setup incomplete</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{canManage ? "BizReply needs your services, pricing, availability, and policies before automation can answer accurately." : "Business automation setup is incomplete. Ask an owner or manager to complete setup."}</p></div></div>{canManage && next.available && next.href && <AppButton size="sm" variant="outline" asChild><Link href={next.href}>Complete setup <ArrowRight className="size-3.5" /></Link></AppButton>}</aside>;
}
