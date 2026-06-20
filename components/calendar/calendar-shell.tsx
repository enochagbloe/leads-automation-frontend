"use client";

import { addDays, format, subDays } from "date-fns";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppErrorState } from "@/components/app-error-state";
import { AppointmentActionDialog } from "@/components/calendar/appointment-action-dialogs";
import { AppointmentAssignmentDialog } from "@/components/calendar/appointment-assignment-dialog";
import { AppointmentDetailDialog } from "@/components/calendar/appointment-detail-dialog";
import { CalendarAgenda } from "@/components/calendar/calendar-agenda";
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { FloatingAppointmentComposer } from "@/components/calendar/floating-appointment-composer";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useAssignAppointment,
  useBusinessMembers,
  useCalendarAppointments,
  useCancelAppointment,
  useCheckAppointmentAvailability,
  useCompleteAppointment,
  useConfirmAppointment,
  useMissedAppointment,
  useNoShowAppointment,
  useRescheduleAppointment,
} from "@/hooks/use-calendar-appointments";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import type { AppointmentAction, AppointmentCalendarQuery, CalendarAppointment } from "@/types/appointment";

type DialogAction = Extract<AppointmentAction, "CONFIRM" | "RESCHEDULE" | "CANCEL" | "COMPLETE" | "NO_SHOW" | "MISSED">;

function appointmentActionError(error: unknown) {
  if (!(error instanceof ApiError)) return getApiErrorMessage(error);
  const messages: Record<string, string> = {
    APPOINTMENT_CANNOT_CONFIRM: "This appointment cannot be confirmed.",
    APPOINTMENT_REASON_REQUIRED: error.message,
    APPOINTMENT_SLOT_UNAVAILABLE: "This time slot is no longer available. Please choose another time.",
    APPOINTMENT_OUTSIDE_BUSINESS_HOURS: "This time is outside your business hours.",
    APPOINTMENT_OVERLAPS_BREAK_TIME: "This time overlaps with a break period.",
    APPOINTMENT_RESCHEDULE_LIMIT_REACHED: "This appointment has already been rescheduled once. Please create a new appointment request instead.",
    APPOINTMENT_CANNOT_RESCHEDULE_PAST: "Past appointments cannot be rescheduled. Please record the appointment outcome or create a new appointment.",
    APPOINTMENT_OUTCOME_ALREADY_RECORDED: "This appointment already has an outcome.",
    APPOINTMENT_CANNOT_MARK_MISSED: "This appointment cannot be marked as missed.",
    APPOINTMENT_CANNOT_COMPLETE: "This appointment cannot be completed.",
    APPOINTMENT_CANNOT_NO_SHOW: "This appointment cannot be marked as no-show.",
    APPOINTMENT_STAFF_UNAVAILABLE: "The assigned staff member already has an appointment at this time.",
    INVALID_ASSIGNED_STAFF: "The selected staff member is not available for this business.",
    PLAN_UPGRADE_REQUIRED: error.message,
    FORBIDDEN: "You do not have permission to perform this action.",
    VALIDATION_ERROR: error.message,
  };
  return messages[error.code] ?? error.message;
}

export function CalendarShell() {
  const profile = useCurrentUser();
  const activeBusinessId = profile.data?.activeBusiness?.id ?? "";
  const role = profile.data?.membership?.role;
  const canCreate = role === "BUSINESS_OWNER" || role === "MANAGER";
  const canAssignStaff = role === "BUSINESS_OWNER" || role === "MANAGER";
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [composerOpen, setComposerOpen] = useState(false);
  const [newlyCreatedAppointmentId, setNewlyCreatedAppointmentId] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<DialogAction | null>(null);
  const [actionAppointment, setActionAppointment] = useState<CalendarAppointment | null>(null);
  const [staffFilter, setStaffFilter] = useState("all");
  const [assignAppointment, setAssignAppointment] = useState<CalendarAppointment | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<CalendarAppointment | null>(null);
  const [assignStaffId, setAssignStaffId] = useState("");

  const query = useMemo<AppointmentCalendarQuery>(() => ({
    dateFrom: format(subDays(selectedDate, 1), "yyyy-MM-dd"),
    dateTo: format(addDays(selectedDate, 6), "yyyy-MM-dd"),
    view: "week",
    assignedStaffId: staffFilter === "all" ? undefined : staffFilter,
  }), [selectedDate, staffFilter]);
  const appointments = useCalendarAppointments(activeBusinessId, query);
  const members = useBusinessMembers(activeBusinessId);
  const availabilityCheck = useCheckAppointmentAvailability();
  const confirmAppointment = useConfirmAppointment(activeBusinessId, actionAppointment?.id ?? "");
  const rescheduleAppointment = useRescheduleAppointment(activeBusinessId, actionAppointment?.id ?? "");
  const cancelAppointment = useCancelAppointment(activeBusinessId, actionAppointment?.id ?? "");
  const completeAppointment = useCompleteAppointment(activeBusinessId, actionAppointment?.id ?? "");
  const noShowAppointment = useNoShowAppointment(activeBusinessId, actionAppointment?.id ?? "");
  const missedAppointment = useMissedAppointment(activeBusinessId, actionAppointment?.id ?? "");
  const assignAppointmentMutation = useAssignAppointment(activeBusinessId, assignAppointment?.id ?? "");
  const orderedAppointments = useMemo(
    () => [...(appointments.data?.appointments ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments.data?.appointments],
  );
  const pendingConfirmationCount = orderedAppointments.filter((appointment) => appointment.status === "PENDING_BUSINESS_CONFIRMATION" || appointment.status === "NEEDS_HUMAN_CONFIRMATION").length;
  const outcomeNeededCount = orderedAppointments.filter((appointment) => appointment.status === "NEEDS_OUTCOME_CONFIRMATION").length;
  const dialogLoading = confirmAppointment.isPending || rescheduleAppointment.isPending || cancelAppointment.isPending || completeAppointment.isPending || noShowAppointment.isPending || missedAppointment.isPending || availabilityCheck.isPending;

  const handleCreated = (appointment: CalendarAppointment) => {
    setNewlyCreatedAppointmentId(appointment.id);
    window.setTimeout(() => setNewlyCreatedAppointmentId(null), 3_000);
  };

  const closeDialog = () => {
    setDialogAction(null);
    setActionAppointment(null);
  };

  const handleAppointmentAction = (appointment: CalendarAppointment, action: AppointmentAction) => {
    setActionAppointment(appointment);
    if (action === "REVIEW") {
      toast.info("Review appointment", { description: "Appointment detail review will be connected in the next pass." });
      return;
    }
    if (action === "VIEW_DETAILS") {
      setDetailAppointment(appointment);
      return;
    }
    if (action === "ASSIGN_STAFF") {
      setAssignAppointment(appointment);
      setAssignStaffId(appointment.assignedStaffId ?? "");
      return;
    }
    setDialogAction(action);
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
            staff={members.data}
            staffFilter={staffFilter}
            onDateChange={setSelectedDate}
            onStaffFilterChange={setStaffFilter}
            onCreate={() => setComposerOpen(true)}
          />
          {pendingConfirmationCount > 0 && (
            <div className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
              <p className="font-bold">{pendingConfirmationCount} {pendingConfirmationCount === 1 ? "appointment needs" : "appointments need"} confirmation</p>
              <p className="mt-1 text-xs leading-5">Review pending appointments and choose Confirm, Reschedule, or Cancel.</p>
            </div>
          )}
          {outcomeNeededCount > 0 && (
            <div className="rounded-2xl border border-warning/35 bg-warning/10 px-4 py-3 text-sm text-warning">
              <p className="font-bold">{outcomeNeededCount} {outcomeNeededCount === 1 ? "appointment needs" : "appointments need"} outcome confirmation</p>
              <p className="mt-1 text-xs leading-5">Mark completed, no-show, or missed so the calendar stays accurate.</p>
            </div>
          )}
          {appointments.isError ? (
            <AppErrorState title="Could not load appointments" description="Your calendar is temporarily unavailable." onRetry={() => void appointments.refetch()} />
          ) : (
            <CalendarAgenda
              appointments={orderedAppointments}
              loading={appointments.isPending}
              canCreate={canCreate}
              canAssignStaff={canAssignStaff}
              newlyCreatedAppointmentId={newlyCreatedAppointmentId}
              onCreate={() => setComposerOpen(true)}
              onAppointmentAction={handleAppointmentAction}
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
      <AppointmentActionDialog
        action={dialogAction}
        appointment={actionAppointment}
        loading={dialogLoading}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onConfirm={(note) => {
          confirmAppointment.mutate({ note: note || null }, {
            onSuccess: () => {
              toast.success("Appointment confirmed.");
              closeDialog();
            },
            onError: (error) => toast.error("Could not confirm appointment", { description: appointmentActionError(error) }),
          });
        }}
        onReschedule={async (values) => {
          try {
            const availability = await availabilityCheck.mutateAsync({
              date: values.newDate,
              time: values.newStartTime,
              timezone: values.timezone,
              assignedStaffId: actionAppointment?.assignedStaffId ?? null,
              serviceId: actionAppointment?.serviceId ?? undefined,
              durationMinutes: actionAppointment?.service?.durationMinutes ?? undefined,
              excludeAppointmentId: actionAppointment?.id,
            });
            if (!availability.available) {
              toast.error("Could not reschedule appointment", { description: availability.message ?? "This time slot is no longer available. Please choose another time." });
              return;
            }
            rescheduleAppointment.mutate(values, {
              onSuccess: () => {
                toast.success("Appointment rescheduled.");
                closeDialog();
              },
              onError: (error) => toast.error("Could not reschedule appointment", { description: appointmentActionError(error) }),
            });
          } catch (error) {
            toast.error("Could not reschedule appointment", { description: appointmentActionError(error) });
          }
        }}
        onCancelAppointment={(values) => {
          cancelAppointment.mutate(values, {
            onSuccess: () => {
              toast.success("Appointment cancelled.");
              closeDialog();
            },
            onError: (error) => toast.error("Could not cancel appointment", { description: appointmentActionError(error) }),
          });
        }}
        onComplete={(values) => {
          completeAppointment.mutate({ input: values }, {
            onSuccess: () => {
              toast.success("Appointment marked as completed.");
              closeDialog();
            },
            onError: (error) => toast.error("Could not complete appointment", { description: appointmentActionError(error) }),
          });
        }}
        onNoShow={(values) => {
          noShowAppointment.mutate({ input: values }, {
            onSuccess: () => {
              toast.success("Appointment marked as no-show.");
              closeDialog();
            },
            onError: (error) => toast.error("Could not update appointment", { description: appointmentActionError(error) }),
          });
        }}
        onMissed={(values) => {
          missedAppointment.mutate({ input: values }, {
            onSuccess: () => {
              toast.success("Appointment marked as missed.");
              closeDialog();
            },
            onError: (error) => toast.error("Could not update appointment", { description: appointmentActionError(error) }),
          });
        }}
      />
      <AppointmentAssignmentDialog
        appointment={assignAppointment}
        staff={members.data}
        value={assignStaffId}
        loading={assignAppointmentMutation.isPending || members.isPending}
        onValueChange={setAssignStaffId}
        onOpenChange={(open) => {
          if (!open) {
            setAssignAppointment(null);
            setAssignStaffId("");
          }
        }}
        onSubmit={() => {
          if (!assignAppointment) return;
          assignAppointmentMutation.mutate({ assignedStaffId: assignStaffId || null }, {
            onSuccess: (appointment) => {
              const wasAutoConfirmed = assignAppointment.status !== "CONFIRMED" && appointment.status === "CONFIRMED";
              toast.success(wasAutoConfirmed ? "Appointment assigned and confirmed." : "Staff assigned to appointment.");
              setAssignAppointment(null);
              setAssignStaffId("");
            },
            onError: (error) => toast.error("Could not assign staff", { description: appointmentActionError(error) }),
          });
        }}
      />
      <AppointmentDetailDialog
        appointment={detailAppointment}
        canAssignStaff={canAssignStaff}
        onAssign={(appointment) => {
          setDetailAppointment(null);
          setAssignAppointment(appointment);
          setAssignStaffId(appointment.assignedStaffId ?? "");
        }}
        onOpenChange={(open) => {
          if (!open) setDetailAppointment(null);
        }}
      />
    </main>
  );
}
