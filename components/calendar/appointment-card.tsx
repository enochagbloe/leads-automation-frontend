import { format } from "date-fns";
import { Clock3, MapPin, MoreHorizontal } from "lucide-react";
import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { cn } from "@/lib/utils";
import type { CalendarAppointment } from "@/types/appointment";

const locationLabels: Record<CalendarAppointment["locationType"], string> = {
  BUSINESS_LOCATION: "Business location",
  CUSTOMER_LOCATION: "Customer location",
  ONLINE: "Online",
  PHONE_CALL: "Phone call",
  TO_BE_CONFIRMED: "Location to be confirmed",
};

function staffName(appointment: CalendarAppointment) {
  const user = appointment.assignedStaff?.user;
  return user ? `${user.firstName} ${user.lastName}` : "Unassigned";
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BR";
}

export function AppointmentCard({ appointment, highlighted }: { appointment: CalendarAppointment; highlighted?: boolean }) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const assigned = staffName(appointment);

  return (
    <article
      className={cn(
        "calendar-appointment-card rounded-2xl border bg-card p-4 shadow-sm transition-[border-color,background-color,box-shadow] duration-500",
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
        <button type="button" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Appointment actions">
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <AppointmentStatusBadge status={appointment.status} />
        {appointment.service && <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">{appointment.service.name}</span>}
        <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">{appointment.source.replaceAll("_", " ").toLowerCase()}</span>
      </div>

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
