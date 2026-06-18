"use client";

import { addDays, format, subDays } from "date-fns";
import { useMemo, useState } from "react";
import { AppErrorState } from "@/components/app-error-state";
import { CalendarAgenda } from "@/components/calendar/calendar-agenda";
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { FloatingAppointmentComposer } from "@/components/calendar/floating-appointment-composer";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCalendarAppointments } from "@/hooks/use-calendar-appointments";
import type { AppointmentCalendarQuery, CalendarAppointment } from "@/types/appointment";

export function CalendarShell() {
  const profile = useCurrentUser();
  const activeBusinessId = profile.data?.activeBusiness?.id ?? "";
  const role = profile.data?.membership?.role;
  const canCreate = role === "BUSINESS_OWNER" || role === "MANAGER";
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [composerOpen, setComposerOpen] = useState(false);
  const [newlyCreatedAppointmentId, setNewlyCreatedAppointmentId] = useState<string | null>(null);

  const query = useMemo<AppointmentCalendarQuery>(() => ({
    dateFrom: format(subDays(selectedDate, 1), "yyyy-MM-dd"),
    dateTo: format(addDays(selectedDate, 6), "yyyy-MM-dd"),
    view: "week",
  }), [selectedDate]);
  const appointments = useCalendarAppointments(activeBusinessId, query);
  const orderedAppointments = useMemo(
    () => [...(appointments.data?.appointments ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments.data?.appointments],
  );

  const handleCreated = (appointment: CalendarAppointment) => {
    setNewlyCreatedAppointmentId(appointment.id);
    window.setTimeout(() => setNewlyCreatedAppointmentId(null), 3_000);
  };

  if (!activeBusinessId) return <AppErrorState title="No active business" description="Select a business before viewing the calendar." />;

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-background px-4 py-5 sm:px-6">
      <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
        <CalendarSidebar appointments={orderedAppointments} selectedDate={selectedDate} />
        <section className="min-w-0 space-y-5">
          <CalendarToolbar
            selectedDate={selectedDate}
            canCreate={canCreate}
            onDateChange={setSelectedDate}
            onCreate={() => setComposerOpen(true)}
          />
          {appointments.isError ? (
            <AppErrorState title="Could not load appointments" description="Your calendar is temporarily unavailable." onRetry={() => void appointments.refetch()} />
          ) : (
            <CalendarAgenda
              appointments={orderedAppointments}
              loading={appointments.isPending}
              canCreate={canCreate}
              newlyCreatedAppointmentId={newlyCreatedAppointmentId}
              onCreate={() => setComposerOpen(true)}
            />
          )}
        </section>
      </div>
      {activeBusinessId && (
        <FloatingAppointmentComposer
          open={composerOpen}
          businessId={activeBusinessId}
          onOpenChange={setComposerOpen}
          onCreated={handleCreated}
        />
      )}
    </main>
  );
}
