import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/appointment";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING_BUSINESS_CONFIRMATION: "Pending confirmation",
  CONFIRMED: "Confirmed",
  NEEDS_HUMAN_CONFIRMATION: "Needs review",
  RESCHEDULE_REQUESTED: "Reschedule requested",
  RESCHEDULED: "Rescheduled",
  NEEDS_OUTCOME_CONFIRMATION: "Outcome needed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  MISSED: "Missed",
};

const styles: Record<AppointmentStatus, string> = {
  PENDING_BUSINESS_CONFIRMATION: "border-warning/20 bg-warning/10 text-warning",
  CONFIRMED: "border-success/20 bg-success/10 text-success",
  NEEDS_HUMAN_CONFIRMATION: "border-accent/25 bg-accent/10 text-accent",
  RESCHEDULE_REQUESTED: "border-info/20 bg-info/10 text-info",
  RESCHEDULED: "border-info/20 bg-info/10 text-info",
  NEEDS_OUTCOME_CONFIRMATION: "border-warning/25 bg-warning/10 text-warning",
  CANCELLED: "border-destructive/20 bg-destructive/10 text-destructive",
  COMPLETED: "border-primary/20 bg-secondary text-primary",
  NO_SHOW: "border-muted bg-muted text-muted-foreground",
  MISSED: "border-destructive/20 bg-destructive/10 text-destructive",
};

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-bold", styles[status], className)}>
      {APPOINTMENT_STATUS_LABELS[status]}
    </span>
  );
}
