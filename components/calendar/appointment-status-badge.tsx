import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/appointment";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING_BUSINESS_CONFIRMATION: "Pending business confirmation",
  CONFIRMED: "Confirmed",
  NEEDS_HUMAN_CONFIRMATION: "Needs confirmation",
  RESCHEDULE_REQUESTED: "Reschedule requested",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
};

const styles: Record<AppointmentStatus, string> = {
  PENDING_BUSINESS_CONFIRMATION: "border-warning/20 bg-warning/10 text-warning",
  CONFIRMED: "border-success/20 bg-success/10 text-success",
  NEEDS_HUMAN_CONFIRMATION: "border-accent/25 bg-accent/10 text-accent",
  RESCHEDULE_REQUESTED: "border-info/20 bg-info/10 text-info",
  RESCHEDULED: "border-info/20 bg-info/10 text-info",
  CANCELLED: "border-destructive/20 bg-destructive/10 text-destructive",
  COMPLETED: "border-primary/20 bg-secondary text-primary",
  NO_SHOW: "border-muted bg-muted text-muted-foreground",
};

export function AppointmentStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-bold", styles[status], className)}>
      {APPOINTMENT_STATUS_LABELS[status]}
    </span>
  );
}
