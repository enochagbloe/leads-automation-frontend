import { formatPlanLimit } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import type { PlanLimit } from "@/types/subscription";

export function UsageMeter({ label, value, limit, className }: { label: string; value: number; limit: PlanLimit; className?: string }) {
  const percentage = limit === null ? 0 : Math.min((value / limit) * 100, 100);
  const warning = limit !== null && percentage >= 80;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("tabular-nums text-muted-foreground", warning && "font-semibold text-warning")}>
          {limit === null ? "Unlimited" : `${new Intl.NumberFormat("en-GH").format(value)} / ${formatPlanLimit(limit)}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${label} usage`} aria-valuemin={0} aria-valuemax={limit ?? undefined} aria-valuenow={limit === null ? undefined : value} aria-valuetext={limit === null ? "Unlimited" : `${value} of ${limit}`}>
        {limit !== null && <div className={cn("h-full rounded-full bg-primary transition-[width] duration-300", warning && "bg-warning")} style={{ width: `${percentage}%` }} />}
      </div>
    </div>
  );
}
