import { Check, Minus } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { PlanBadge } from "@/components/subscription/plan-badge";
import { formatPlanLimit, formatPlanPrice, PLAN_LIMIT_LABELS } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import type { Plan, PlanLimitKey } from "@/types/subscription";

const comparisonLimits: PlanLimitKey[] = ["businesses", "staff", "services", "appointments", "conversations", "knowledgeBaseItems"];

function FeatureRow({ enabled, label }: { enabled: boolean; label: string }) {
  const Icon = enabled ? Check : Minus;
  return <li className={cn("flex items-center gap-2 text-sm", !enabled && "text-muted-foreground")}><Icon className={cn("size-4 shrink-0", enabled && "text-success")} />{label}</li>;
}

export function PlanCard({ plan, current = false }: { plan: Plan; current?: boolean }) {
  return (
    <AppCard className={cn("flex h-full flex-col", plan.code === "PLUS" && "border-primary/40 shadow-md")}>
      <div className="flex items-start justify-between gap-4">
        <div><PlanBadge plan={plan.code} /><p className="mt-4 text-3xl font-bold tracking-tight">{formatPlanPrice(plan)}<span className="text-sm font-medium text-muted-foreground"> / month</span></p></div>
        {current && <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">Current plan</span>}
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {comparisonLimits.map((key) => <FeatureRow key={key} enabled label={`${formatPlanLimit(plan.limits[key])} ${PLAN_LIMIT_LABELS[key].toLowerCase()}`} />)}
        <FeatureRow enabled={plan.features.analytics !== "NONE"} label={plan.features.analytics === "ADVANCED" ? "Advanced analytics" : plan.features.analytics === "BASIC" ? "Basic analytics" : "No analytics"} />
        <FeatureRow enabled={plan.features.brandingRemoval} label={plan.features.brandingRemoval ? "Branding removal" : "No branding removal"} />
        <FeatureRow enabled={plan.features.prioritySupport} label={plan.features.prioritySupport ? "Priority support" : "No priority support"} />
      </ul>
      <AppButton className="mt-6 w-full" variant={current ? "secondary" : "outline"} disabled>{current ? "Current plan" : "Upgrade coming soon"}</AppButton>
    </AppCard>
  );
}
