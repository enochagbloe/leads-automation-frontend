import { cn } from "@/lib/utils";
import type { SubscriptionStatus } from "@/types/subscription";

const styles: Record<SubscriptionStatus, string> = {
  TRIALING: "bg-info/10 text-info",
  ACTIVE: "bg-success/10 text-success",
  PAST_DUE: "bg-warning/10 text-warning",
  CANCELLED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-destructive/10 text-destructive",
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize", styles[status])}>{status.toLowerCase().replace("_", " ")}</span>;
}
