import { format } from "date-fns";
import { Clock3, MapPin, MoreHorizontal } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { cn } from "@/lib/utils";
import type { AppointmentAction, CalendarAppointment } from "@/types/appointment";

const locationLabels: Record<CalendarAppointment["locationType"], string> = {
  BUSINESS_LOCATION: "Business location",
  CUSTOMER_LOCATION: "Customer location",
  ONLINE: "Online",
  PHONE_CALL: "Phone call",
  TO_BE_CONFIRMED: "Location to be confirmed",
};

function staffName(appointment: CalendarAppointment) {
  if (appointment.assignedStaff?.name) return appointment.assignedStaff.name;
  const user = appointment.assignedStaff?.user;
  return user ? `${user.firstName} ${user.lastName}` : "Unassigned";
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BR";
}

function fallbackActions(appointment: CalendarAppointment): AppointmentAction[] {
  if (appointment.availableActions) {
    return sanitizeActions(appointment, appointment.availableActions);
  }
  if (appointment.status === "PENDING_BUSINESS_CONFIRMATION") return ["CONFIRM", "RESCHEDULE", "CANCEL"];
  if (appointment.status === "NEEDS_HUMAN_CONFIRMATION" || appointment.status === "RESCHEDULE_REQUESTED") return ["REVIEW", "CONFIRM", "RESCHEDULE", "CANCEL"];
  if (appointment.status === "NEEDS_OUTCOME_CONFIRMATION") return ["COMPLETE", "NO_SHOW", "MISSED"];
  if (appointment.status === "CONFIRMED" || appointment.status === "RESCHEDULED") return sanitizeActions(appointment, ["RESCHEDULE", "CANCEL", "COMPLETE", "NO_SHOW"]);
  return [];
}

function sanitizeActions(appointment: CalendarAppointment, actions: AppointmentAction[]) {
  const ended = new Date(appointment.endTime).getTime() < Date.now();
  return actions.filter((action) => {
    if (action !== "RESCHEDULE") return true;
    return !ended && (appointment.rescheduleCount ?? 0) < 1;
  });
}

function isUrgent(appointment: CalendarAppointment) {
  return appointment.status === "PENDING_BUSINESS_CONFIRMATION"
    || appointment.status === "NEEDS_HUMAN_CONFIRMATION"
    || appointment.status === "NEEDS_OUTCOME_CONFIRMATION";
}

const actionLabels: Record<AppointmentAction, string> = {
  CONFIRM: "Confirm",
  RESCHEDULE: "Reschedule",
  CANCEL: "Cancel",
  COMPLETE: "Completed",
  NO_SHOW: "No-show",
  MISSED: "Missed",
  ASSIGN_STAFF: "Assign staff",
  REVIEW: "Review",
  VIEW_DETAILS: "View details",
};

const finalStatuses = new Set<CalendarAppointment["status"]>(["COMPLETED", "CANCELLED", "NO_SHOW", "MISSED"]);

export function AppointmentCard({
  appointment,
  highlighted,
  canAssignStaff,
  onAction,
}: {
  appointment: CalendarAppointment;
  highlighted?: boolean;
  canAssignStaff?: boolean;
  onAction?: (appointment: CalendarAppointment, action: AppointmentAction) => void;
}) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const assigned = staffName(appointment);
  const actions = fallbackActions(appointment);
  const urgent = isUrgent(appointment);
  const directActions = urgent ? actions.filter((action) => action !== "ASSIGN_STAFF") : [];
  const assignAction = canAssignStaff && !finalStatuses.has(appointment.status) && !actions.includes("ASSIGN_STAFF") ? ["ASSIGN_STAFF" as AppointmentAction] : [];
  const menuActions = urgent ? ["VIEW_DETAILS" as AppointmentAction, ...assignAction] : ["VIEW_DETAILS" as AppointmentAction, ...assignAction, ...actions];

  return (
    <article
      className={cn(
        "calendar-appointment-card rounded-2xl border bg-card p-4 shadow-sm transition-[border-color,background-color,box-shadow] duration-500",
        urgent && "border-warning/35 bg-warning/5",
        highlighted && "border-primary/50 bg-secondary/70 shadow-[0_18px_50px_rgba(7,94,69,0.14)]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold">{appointment.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden="true" />{format(start, "p")} — {format(end, "p")}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden="true" />{appointment.location ?? locationLabels[appointment.locationType]}</span>
          </div>
        </div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Appointment actions">
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} collisionPadding={12} className="account-menu-content z-[70] min-w-44 rounded-xl border bg-popover p-1.5 shadow-[0_14px_40px_rgba(20,35,27,0.14)] outline-none">
              {menuActions.map((action) => (
                <DropdownMenu.Item
                  key={action}
                  onSelect={() => onAction?.(appointment, action)}
                  className={cn(
                    "flex min-h-9 cursor-pointer select-none items-center rounded-lg px-3 text-xs font-semibold outline-none data-[highlighted]:bg-muted",
                    action === "CANCEL" && "text-destructive data-[highlighted]:bg-destructive/10",
                  )}
                >
                  {actionLabels[action]}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <AppointmentStatusBadge status={appointment.status} />
        {urgent && <span className="rounded-full border border-warning/25 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">Action required</span>}
        {appointment.service && <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">{appointment.service.name}</span>}
        <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">{appointment.source.replaceAll("_", " ").toLowerCase()}</span>
      </div>

      {appointment.status === "NEEDS_OUTCOME_CONFIRMATION" && (
        <p className="mt-3 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold leading-5 text-warning">
          Tell us what happened with this appointment.
        </p>
      )}

      {appointment.status === "NEEDS_HUMAN_CONFIRMATION" && (
        <p className="mt-3 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold leading-5 text-warning">
          This appointment needs human review before it can be confirmed.
        </p>
      )}

      {appointment.rescheduleCount && appointment.rescheduleCount >= 1 ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          This appointment has already been rescheduled once. Create a new appointment if the customer wants another time.
        </p>
      ) : null}

      {directActions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          {directActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onAction?.(appointment, action)}
              className={cn(
                "inline-flex min-h-9 items-center justify-center rounded-lg border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                action === "CONFIRM" && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                action === "CANCEL" && "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15",
                action !== "CONFIRM" && action !== "CANCEL" && "bg-background hover:bg-muted",
              )}
            >
              {actionLabels[action]}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
        <div className="min-w-0 text-sm">
          <p className="truncate font-semibold">{appointment.lead?.fullName ?? appointment.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{appointment.lead?.phone ?? "Customer details can be added later"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initials(assigned)}</span>
          <div className="hidden text-right text-xs sm:block">
            <p className="font-semibold">{assigned}</p>
            <p className="text-muted-foreground">Assigned</p>
          </div>
        </div>
      </div>
    </article>
  );
}
