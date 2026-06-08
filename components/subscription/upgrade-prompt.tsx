import { ArrowUpRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/app-button";
import { cn } from "@/lib/utils";
import type { PlanCode } from "@/types/subscription";

export function UpgradePrompt({ message, recommendedPlan, compact = false, className }: { message: string; recommendedPlan?: PlanCode | null; compact?: boolean; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-accent/30 bg-accent/10 p-4", !compact && "sm:flex sm:items-center sm:justify-between sm:gap-5", className)}>
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent"><LockKeyhole className="size-4" /></span>
        <div>
          <p className="text-sm font-semibold">Upgrade required</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{message}</p>
        </div>
      </div>
      {!compact && <AppButton asChild variant="outline" className="mt-4 shrink-0 sm:mt-0"><Link href="/settings/billing">View {recommendedPlan ? `${recommendedPlan.toLowerCase()} plan` : "plans"} <ArrowUpRight className="size-4" /></Link></AppButton>}
    </div>
  );
}
