import { format } from "date-fns";
import { CalendarClock, Check, Clock3, FileText, FolderOpen, MapPin, MoreVertical, UserRound, X } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AppointmentStatusBadge, APPOINTMENT_STATUS_LABELS } from "@/components/calendar/appointment-status-badge";
import { cn } from "@/lib/utils";
import type { AppointmentAction, AppointmentStatusIndicator, CalendarAppointment } from "@/types/appointment";

const locationLabels: Record<CalendarAppointment["locationType"], string> = {
  BUSINESS_LOCATION: "Business location",
  CUSTOMER_LOCATION: "Customer location",
  ONLINE: "Online",
  PHONE_CALL: "Phone call",
  TO_BE_CONFIRMED: "Location to be confirmed",
};

const actionLabels: Record<AppointmentAction, string> = {
  CONFIRM: "Approve",
  RESCHEDULE: "Reschedule",
  CANCEL: "Decline",
  COMPLETE: "Update Outcome",
  NO_SHOW: "No-show",
  MISSED: "Missed",
  ASSIGN_STAFF: "Assign staff",
  CLAIM: "Take appointment",
  REVIEW: "Review",
  VIEW_DETAILS: "View details",
};

const finalStatuses = new Set<CalendarAppointment["status"]>(["COMPLETED", "CANCELLED", "NO_SHOW", "MISSED"]);

function staffName(appointment: CalendarAppointment) {
  if (appointment.assignedStaff?.name) return appointment.assignedStaff.name;
  const user = appointment.assignedStaff?.user;
  return user ? `${user.firstName} ${user.lastName}` : "Unassigned";
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BR";
}

function sanitizeActions(appointment: CalendarAppointment, actions: AppointmentAction[]) {
  const ended = new Date(appointment.endTime).getTime() < Date.now();
  return actions.filter((action) => {
    if (action !== "RESCHEDULE") return true;
    return !ended && (appointment.rescheduleCount ?? 0) < 1;
  });
}

function fallbackActions(appointment: CalendarAppointment): AppointmentAction[] {
  if (appointment.availableActions) return sanitizeActions(appointment, appointment.availableActions);
  if (appointment.status === "PENDING_BUSINESS_CONFIRMATION") return ["CONFIRM", "RESCHEDULE", "CANCEL"];
  if (appointment.status === "NEEDS_HUMAN_CONFIRMATION" || appointment.status === "RESCHEDULE_REQUESTED") return ["REVIEW", "CONFIRM", "RESCHEDULE", "CANCEL"];
  if (appointment.status === "NEEDS_OUTCOME_CONFIRMATION") return ["COMPLETE", "NO_SHOW", "MISSED"];
  if (appointment.status === "CONFIRMED" || appointment.status === "RESCHEDULED") return sanitizeActions(appointment, ["RESCHEDULE", "CANCEL", "COMPLETE", "NO_SHOW"]);
  return [];
}

function fallbackIndicator(appointment: CalendarAppointment): AppointmentStatusIndicator | null {
  if (appointment.status === "PENDING_BUSINESS_CONFIRMATION" || appointment.status === "NEEDS_HUMAN_CONFIRMATION") return { type: "NEED_CONFIRMATION", label: "Need Confirmation" };
  if (appointment.status === "NEEDS_OUTCOME_CONFIRMATION") return { type: "OUTCOME_REQUIRED", label: "Outcome Required" };
  if (appointment.status === "NO_SHOW") return { type: "NO_SHOW", label: "No-show" };
  if (appointment.status === "MISSED") return { type: "MISSED", label: "Missed" };
  if (appointment.status === "RESCHEDULED" || appointment.status === "RESCHEDULE_REQUESTED") return { type: "RESCHEDULED", label: appointment.status === "RESCHEDULE_REQUESTED" ? "Reschedule Requested" : "Rescheduled" };
  if (appointment.status === "COMPLETED") return { type: "COMPLETED", label: "Completed" };
  return null;
}

function indicatorTone(type?: string | null) {
  if (type === "NEED_CONFIRMATION") return { banner: "bg-warning text-warning-foreground", border: "border-warning/55", glow: "shadow-[0_16px_42px_rgba(166,101,8,0.13)]" };
  if (type === "COMPLAINT_LINKED") return { banner: "bg-destructive text-destructive-foreground", border: "border-destructive/40", glow: "shadow-[0_16px_42px_rgba(180,35,24,0.12)]" };
  if (type === "OUTCOME_REQUIRED") return { banner: "bg-accent text-accent-foreground", border: "border-accent/45", glow: "shadow-[0_16px_42px_rgba(185,137,38,0.12)]" };
  if (type === "STARTING_SOON") return { banner: "bg-info text-info-foreground", border: "border-info/40", glow: "shadow-[0_16px_42px_rgba(37,99,169,0.1)]" };
  if (type === "IN_PROGRESS") return { banner: "bg-primary text-primary-foreground", border: "border-primary/40", glow: "shadow-[0_16px_42px_rgba(7,94,69,0.12)]" };
  if (type === "MISSED" || type === "NO_SHOW") return { banner: "bg-muted-foreground text-background", border: "border-muted-foreground/30", glow: "" };
  if (type === "COMPLETED") return { banner: "bg-secondary text-secondary-foreground", border: "border-secondary", glow: "" };
  if (type === "RESCHEDULED") return { banner: "bg-info/12 text-info", border: "border-info/30", glow: "" };
  return { banner: "bg-muted text-muted-foreground", border: "border-border", glow: "" };
}

function sourceLabel(source: CalendarAppointment["source"]) {
  if (source === "AI_CREATED") return "AI booked";
  if (source === "AI_ASSISTED") return "AI assisted";
  if (source === "CUSTOMER_REQUESTED") return "Customer request";
  if (source === "CONVERSATION") return "Conversation";
  return "Manual";
}

function directActionsFor(appointment: CalendarAppointment, actions: AppointmentAction[]) {
  const indicator = appointment.statusIndicator ?? fallbackIndicator(appointment);
  if (indicator?.type === "NEED_CONFIRMATION") return actions.filter((action) => ["CONFIRM", "CANCEL", "RESCHEDULE"].includes(action));
  if (indicator?.type === "OUTCOME_REQUIRED") return actions.includes("COMPLETE") ? ["COMPLETE" as AppointmentAction] : [];
  return [];
}

export function AppointmentCard({
  appointment,
  highlighted,
  canAssignStaff,
  canClaim,
  onAction,
}: {
  appointment: CalendarAppointment;
  highlighted?: boolean;
  canAssignStaff?: boolean;
  canClaim?: boolean;
  onAction?: (appointment: CalendarAppointment, action: AppointmentAction) => void;
}) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const assigned = staffName(appointment);
  const actions = fallbackActions(appointment);
  const indicator = appointment.statusIndicator ?? fallbackIndicator(appointment);
  const tone = indicatorTone(indicator?.type);
  const directActions = directActionsFor(appointment, actions);
  const assignAction = canAssignStaff && !finalStatuses.has(appointment.status) && !actions.includes("ASSIGN_STAFF") ? ["ASSIGN_STAFF" as AppointmentAction] : [];
  const claimAction = canClaim && !appointment.assignedStaffId && !finalStatuses.has(appointment.status) ? ["CLAIM" as AppointmentAction] : [];
  const directActionSet = new Set(directActions);
  const menuActions = ["VIEW_DETAILS" as AppointmentAction, ...claimAction, ...assignAction, ...actions.filter((action) => !directActionSet.has(action))];
  const customerName = appointment.lead?.fullName ?? "Customer not linked";
  const location = appointment.location ?? locationLabels[appointment.locationType];

  return (
    <article
      className={cn(
        "calendar-appointment-card group overflow-hidden rounded-2xl border bg-card shadow-[0_10px_34px_rgba(20,35,27,0.055)] transition-[border-color,box-shadow,transform,background-color] duration-200 hover:shadow-[0_18px_42px_rgba(20,35,27,0.09)]",
        indicator && tone.border,
        indicator && tone.glow,
        highlighted && "border-primary/50 bg-secondary/55 shadow-[0_18px_50px_rgba(7,94,69,0.14)]",
      )}
    >
      {indicator && (
        <div className={cn("flex h-7 items-center justify-center px-4 text-[11px] font-black uppercase tracking-[0.12em]", tone.banner)}>
          {indicator.label}
        </div>
      )}
      <div className="grid gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <button type="button" className="min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onAction?.(appointment, "VIEW_DETAILS")}>
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-[15px] font-bold leading-5">{appointment.title}</h3>
            {appointment.conversationId && <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-label="Conversation linked" />}
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">{customerName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden="true" />{format(start, "p")} - {format(end, "p")}</span>
            <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{location}</span></span>
            {appointment.service?.name && <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5" aria-hidden="true" />{appointment.service.name}</span>}
          </div>
        </button>

        <div className="flex items-start justify-between gap-3 md:justify-end">
          <div className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-[10px] font-bold text-primary ring-2 ring-card">
              {initials(assigned)}
            </span>
            <div className="hidden max-w-28 text-right text-xs sm:block">
              <p className="truncate font-semibold">{assigned}</p>
              <p className="text-muted-foreground">{sourceLabel(appointment.source)}</p>
            </div>
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Appointment actions">
                <MoreVertical className="size-4" />
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

        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          {!indicator && <AppointmentStatusBadge status={appointment.status} className="min-h-6 px-2 text-[11px]" />}
          {indicator && appointment.status !== "CONFIRMED" && <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{APPOINTMENT_STATUS_LABELS[appointment.status]}</span>}
          {appointment.secondaryStatusIndicators?.slice(0, 2).map((item) => <span key={`${item.type}-${item.label}`} className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{item.label}</span>)}
          {appointment.rescheduleCount && appointment.rescheduleCount >= 1 ? <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-semibold text-info">Rescheduled once</span> : null}
          {directActions.length > 0 && (
            <div className="ml-auto flex flex-wrap gap-2">
              {directActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => onAction?.(appointment, action)}
                  className={cn(
                    "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    action === "CONFIRM" && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                    action === "CANCEL" && "border-border bg-card text-foreground hover:bg-muted",
                    action === "RESCHEDULE" && "border-warning/25 bg-warning/10 text-warning hover:bg-warning/15",
                    action === "COMPLETE" && "border-primary/20 bg-secondary text-primary hover:bg-secondary/80",
                  )}
                >
                  {action === "CONFIRM" && <Check className="size-3.5" />}
                  {action === "CANCEL" && <X className="size-3.5" />}
                  {action === "RESCHEDULE" && <CalendarClock className="size-3.5" />}
                  {action === "COMPLETE" && <FolderOpen className="size-3.5" />}
                  {actionLabels[action]}
                </button>
              ))}
            </div>
          )}
          {!appointment.assignedStaffId && canClaim && !finalStatuses.has(appointment.status) && (
            <button type="button" onClick={() => onAction?.(appointment, "CLAIM")} className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 text-xs font-bold text-primary transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <UserRound className="size-3.5" />Take appointment
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
