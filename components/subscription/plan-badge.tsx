import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanCode } from "@/types/subscription";

const styles: Record<PlanCode, string> = {
  BASIC: "bg-muted text-muted-foreground",
  PLUS: "bg-secondary text-secondary-foreground",
  PREMIUM: "bg-accent/15 text-accent",
};

export function PlanBadge({ plan, className }: { plan: PlanCode; className?: string }) {
  const Icon = plan === "PREMIUM" ? Crown : Sparkles;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize", styles[plan], className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {plan.toLowerCase()}
    </span>
  );
}
