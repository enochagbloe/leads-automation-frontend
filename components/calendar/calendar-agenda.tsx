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
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-2xl" />)}
      </div>
    );
  }

  if (!appointments.length) return <CalendarEmptyState canCreate={canCreate} onCreate={onCreate} />;

  const groups = groupedByDay(appointments);

  return (
    <div className="space-y-7">
      {Object.entries(groups).map(([date, items]) => (
        <section key={date} aria-labelledby={`agenda-${date}`}>
          <div className="mb-3 flex items-center gap-3">
            <h2 id={`agenda-${date}`} className="text-sm font-bold">{format(new Date(`${date}T00:00:00`), "EEEE, MMMM d")}</h2>
            <span className="h-px flex-1 bg-border" />
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
