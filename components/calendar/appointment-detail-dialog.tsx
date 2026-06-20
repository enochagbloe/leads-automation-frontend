"use client";

import { format } from "date-fns";
import { Clock3, MapPin, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { AppButton } from "@/components/app-button";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import type { CalendarAppointment } from "@/types/appointment";

function staffName(appointment: CalendarAppointment) {
  if (appointment.assignedStaff?.name) return appointment.assignedStaff.name;
  const user = appointment.assignedStaff?.user;
  return user ? `${user.firstName} ${user.lastName}` : "No staff assigned";
}

export function AppointmentDetailDialog({
  appointment,
  canAssignStaff,
  onAssign,
  onOpenChange,
}: {
  appointment: CalendarAppointment | null;
  canAssignStaff?: boolean;
  onAssign: (appointment: CalendarAppointment) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const open = Boolean(appointment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-[0_24px_80px_rgba(20,35,27,0.22)]">
          {appointment && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-lg font-bold">{appointment.title}</DialogTitle>
                  <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                    Appointment lifecycle and staff assignment details.
                  </DialogDescription>
                </div>
                <AppointmentStatusBadge status={appointment.status} />
              </div>

              <div className="mt-5 grid gap-3 text-sm">
                <DetailRow icon={<Clock3 className="size-4" />} label="Time" value={`${format(new Date(appointment.startTime), "PPp")} - ${format(new Date(appointment.endTime), "p")}`} />
                <DetailRow icon={<MapPin className="size-4" />} label="Location" value={appointment.location ?? appointment.locationType.replaceAll("_", " ").toLowerCase()} />
                <DetailRow icon={<UserRound className="size-4" />} label="Assigned staff" value={staffName(appointment)} />
              </div>

              <div className="mt-5 rounded-xl border bg-background p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Lifecycle</p>
                <div className="mt-3 space-y-2 text-sm">
                  <p><span className="font-semibold">Reschedule count:</span> {appointment.rescheduleCount ?? 0}</p>
                  {(appointment.rescheduleCount ?? 0) >= 1 && <p className="text-xs leading-5 text-muted-foreground">Reschedule limit reached. Create a new appointment if the customer wants another time.</p>}
                  {appointment.outcomeRequiredAt && <p><span className="font-semibold">Outcome required:</span> {format(new Date(appointment.outcomeRequiredAt), "PPp")}</p>}
                  {appointment.outcomeConfirmedAt && <p><span className="font-semibold">Outcome confirmed:</span> {format(new Date(appointment.outcomeConfirmedAt), "PPp")}</p>}
                  {appointment.status === "NEEDS_OUTCOME_CONFIRMATION" && <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold leading-5 text-warning">This appointment needs an outcome. Mark it as completed, no-show, or missed.</p>}
                  {appointment.autoConfirmed && <p className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold leading-5 text-primary">Auto-confirmed because staff was assigned.</p>}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                {canAssignStaff && (
                  <AppButton type="button" variant="outline" onClick={() => onAssign(appointment)}>
                    Assign staff
                  </AppButton>
                )}
                <AppButton type="button" onClick={() => onOpenChange(false)}>Done</AppButton>
              </div>
            </>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-background px-3 py-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span>
        <span className="block text-xs font-bold text-muted-foreground">{label}</span>
        <span className="mt-0.5 block font-semibold">{value}</span>
      </span>
    </div>
  );
}
