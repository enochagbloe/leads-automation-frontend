import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, leadStatusTone } from "@/lib/leads";
import type { LeadStatus } from "@/types/lead";

export function LeadStatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", leadStatusTone(status), className)}>{LEAD_STATUS_LABELS[status]}</span>;
}
