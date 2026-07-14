import { format } from "date-fns";
import { CalendarEmptyState } from "@/components/calendar/calendar-empty-state";
import { AppointmentCard } from "@/components/calendar/appointment-card";
import { Skeleton } from "@/components/ui/skeleton";
import { appointmentDateKey } from "@/lib/appointment-dates";
import type { AppointmentAction, CalendarAppointment } from "@/types/appointment";

function groupedByDay(appointments: CalendarAppointment[]) {
  return appointments.reduce<Record<string, CalendarAppointment[]>>((groups, appointment) => {
    const key = appointmentDateKey(appointment.startTime, appointment.timezone);
    groups[key] = [...(groups[key] ?? []), appointment];
    return groups;
  }, {});
}

export function CalendarAgenda({
  appointments,
  loading,
  canCreate,
  canAssignStaff,
  canClaimAppointments,
  newlyCreatedAppointmentId,
  onCreate,
  onAppointmentAction,
}: {
  appointments: CalendarAppointment[];
  loading: boolean;
  canCreate: boolean;
  canAssignStaff?: boolean;
  canClaimAppointments?: boolean;
  newlyCreatedAppointmentId?: string | null;
  onCreate: () => void;
  onAppointmentAction?: (appointment: CalendarAppointment, action: AppointmentAction) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-5">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
      </div>
    );
  }

  if (!appointments.length) return <CalendarEmptyState canCreate={canCreate} onCreate={onCreate} />;

  const groups = groupedByDay(appointments);

  return (
    <div className="space-y-8">
      {Object.entries(groups).map(([date, items]) => (
        <section key={date} aria-labelledby={`agenda-${date}`} className="grid gap-3 lg:grid-cols-[132px_minmax(0,1fr)]">
          <div className="flex items-end justify-between gap-3 border-b pb-3 lg:block lg:border-b-0 lg:pb-0 lg:pt-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">{format(new Date(`${date}T00:00:00`), "EEEE")}</p>
              <h2 id={`agenda-${date}`} className="mt-1 text-base font-bold tracking-tight">{format(new Date(`${date}T00:00:00`), "MMMM d")}</h2>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">{items.length} {items.length === 1 ? "appointment" : "appointments"}</p>
            </div>
            <span className="h-px flex-1 bg-border lg:mt-5 lg:block lg:w-full" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            {items.map((appointment) => (
              <div key={appointment.id} className={appointment.id === newlyCreatedAppointmentId ? "animate-[calendar-card-in_260ms_cubic-bezier(0.16,1,0.3,1)]" : undefined}>
                <AppointmentCard appointment={appointment} highlighted={appointment.id === newlyCreatedAppointmentId} canAssignStaff={canAssignStaff} canClaim={canClaimAppointments} onAction={onAppointmentAction} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
