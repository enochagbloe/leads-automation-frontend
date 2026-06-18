import type { CalendarAppointment } from "@/types/appointment";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function CalendarSidebar({ appointments, selectedDate }: { appointments: CalendarAppointment[]; selectedDate: Date }) {
  return (
    <aside className="px-1 py-5 lg:sticky lg:top-20 lg:h-fit">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">{WEEKDAYS[selectedDate.getDay()]}</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{selectedDate.toLocaleDateString(undefined, { month: "long", day: "numeric" })}</h1>
      <p className="mt-2 text-sm font-semibold text-muted-foreground">{appointments.length} {appointments.length === 1 ? "appointment" : "appointments"}</p>
    </aside>
  );
}
