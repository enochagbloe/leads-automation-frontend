"use client";

import { format } from "date-fns";
import { useState } from "react";
import { AppButton } from "@/components/app-button";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AppIsoDatePicker } from "@/components/app-date-picker";
import { AppTimePicker } from "@/components/app-time-picker";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import type { AppointmentAction, CalendarAppointment } from "@/types/appointment";
type DialogAction = Extract<AppointmentAction, "CONFIRM" | "RESCHEDULE" | "CANCEL" | "COMPLETE" | "NO_SHOW" | "MISSED">;

export function AppointmentActionDialog({
  action,
  appointment,
  loading,
  onOpenChange,
  onConfirm,
  onReschedule,
  onCancelAppointment,
  onComplete,
  onNoShow,
  onMissed,
}: {
  action: DialogAction | null;
  appointment: CalendarAppointment | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note: string) => void;
  onReschedule: (values: { newDate: string; newStartTime: string; timezone: string; rescheduleReason: string; notifyCustomer: false }) => void;
  onCancelAppointment: (values: { cancellationReason: string; notifyCustomer: false }) => void;
  onComplete: (values: { completedNote: string | null }) => void;
  onNoShow: (values: { noShowReason: string | null }) => void;
  onMissed: (values: { missedReason: string | null }) => void;
}) {
  const open = Boolean(action && appointment);

  if (!appointment || !action) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <AppointmentActionDialogContent
          key={`${appointment.id}:${action}`}
          action={action}
          appointment={appointment}
          loading={loading}
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
          onReschedule={onReschedule}
          onCancelAppointment={onCancelAppointment}
          onComplete={onComplete}
          onNoShow={onNoShow}
          onMissed={onMissed}
        />
      </DialogPortal>
    </Dialog>
  );
}

function AppointmentActionDialogContent({
  action,
  appointment,
  loading,
  onOpenChange,
  onConfirm,
  onReschedule,
  onCancelAppointment,
  onComplete,
  onNoShow,
  onMissed,
}: {
  action: DialogAction;
  appointment: CalendarAppointment;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note: string) => void;
  onReschedule: (values: { newDate: string; newStartTime: string; timezone: string; rescheduleReason: string; notifyCustomer: false }) => void;
  onCancelAppointment: (values: { cancellationReason: string; notifyCustomer: false }) => void;
  onComplete: (values: { completedNote: string | null }) => void;
  onNoShow: (values: { noShowReason: string | null }) => void;
  onMissed: (values: { missedReason: string | null }) => void;
}) {
  const start = new Date(appointment.startTime);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(start, "yyyy-MM-dd"));
  const [time, setTime] = useState(format(start, "HH:mm"));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (!loading) onOpenChange(false);
  };

  const submit = () => {
    if (action === "CONFIRM") {
      onConfirm(note.trim());
      return;
    }
    if (action === "RESCHEDULE") {
      if (!reason.trim()) {
        setError("Please provide a reason before rescheduling this appointment.");
        return;
      }
      onReschedule({ newDate: date, newStartTime: time, timezone: appointment.timezone, rescheduleReason: reason.trim(), notifyCustomer: false });
      return;
    }
    if (action === "CANCEL") {
      if (!reason.trim()) {
        setError("Please provide a reason before cancelling this appointment.");
        return;
      }
      onCancelAppointment({ cancellationReason: reason.trim(), notifyCustomer: false });
      return;
    }
    if (action === "COMPLETE") {
      onComplete({ completedNote: note.trim() || null });
      return;
    }
    if (action === "NO_SHOW") {
      onNoShow({ noShowReason: reason.trim() || null });
      return;
    }
    if (action === "MISSED") {
      onMissed({ missedReason: reason.trim() || null });
    }
  };

  return (
    <DialogContent className="left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-[0_24px_80px_rgba(20,35,27,0.22)]">
          {action === "CONFIRM" && (
            <div>
              <DialogTitle className="text-lg font-bold">Confirm appointment</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                This will confirm the appointment and mark it as ready for the customer.
              </DialogDescription>
              <AppFormField id="appointment-confirm-note" label="Internal note" hint="Optional. This is not sent to the customer.">
                <textarea
                  id="appointment-confirm-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                  placeholder="Confirmed by owner."
                />
              </AppFormField>
            </div>
          )}

          {action === "RESCHEDULE" && (
            <div className="space-y-4">
              <div>
                <DialogTitle className="text-lg font-bold">Reschedule appointment</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                  Choose a new time and record the internal reason. The reason is not sent to the customer.
                </DialogDescription>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <AppFormField id="appointment-reschedule-date" label="New date" required>
                  <AppIsoDatePicker id="appointment-reschedule-date" value={date} onChange={setDate} clearable={false} />
                </AppFormField>
                <AppFormField id="appointment-reschedule-time" label="New start time" required>
                  <AppTimePicker id="appointment-reschedule-time" value={time} onChange={setTime} clearable={false} />
                </AppFormField>
              </div>
              <ReasonField
                id="appointment-reschedule-reason"
                label="Reschedule reason"
                value={reason}
                onChange={(value) => {
                  setReason(value);
                  setError(null);
                }}
                placeholder="Explain why this appointment is being rescheduled."
                error={error ?? undefined}
              />
            </div>
          )}

          {action === "CANCEL" && (
            <div className="space-y-4">
              <div>
                <DialogTitle className="text-lg font-bold">Cancel appointment</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                  Record why this appointment is being cancelled. This internal reason is not sent to the customer.
                </DialogDescription>
              </div>
              <ReasonField
                id="appointment-cancel-reason"
                label="Cancellation reason"
                value={reason}
                onChange={(value) => {
                  setReason(value);
                  setError(null);
                }}
                placeholder="Explain why this appointment is being cancelled."
                error={error ?? undefined}
              />
            </div>
          )}

          {action === "COMPLETE" && (
            <div>
              <DialogTitle className="text-lg font-bold">Mark as completed</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                Use this when the appointment happened successfully.
              </DialogDescription>
              <AppFormField id="appointment-completed-note" label="Completed note" hint="Optional. This stays internal.">
                <textarea
                  id="appointment-completed-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                  placeholder="Meeting completed successfully."
                />
              </AppFormField>
            </div>
          )}

          {action === "NO_SHOW" && (
            <div className="space-y-4">
              <div>
                <DialogTitle className="text-lg font-bold">Mark as no-show</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use this when the customer did not attend or did not respond.
                </DialogDescription>
              </div>
              <OptionalReasonField
                id="appointment-no-show-reason"
                label="No-show reason"
                value={reason}
                onChange={setReason}
                placeholder="Customer did not arrive or respond."
              />
            </div>
          )}

          {action === "MISSED" && (
            <div className="space-y-4">
              <div>
                <DialogTitle className="text-lg font-bold">Mark as missed</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use this when the business could not attend or failed to handle the appointment.
                </DialogDescription>
              </div>
              <OptionalReasonField
                id="appointment-missed-reason"
                label="Missed reason"
                value={reason}
                onChange={setReason}
                placeholder="Business could not attend due to emergency."
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <AppButton type="button" variant="outline" onClick={close} disabled={loading}>Cancel</AppButton>
            <AppButton type="button" variant={action === "CANCEL" || action === "NO_SHOW" || action === "MISSED" ? "destructive" : "default"} onClick={submit} loading={loading} loadingText="Saving">
              {submitLabel(action)}
            </AppButton>
          </div>
    </DialogContent>
  );
}

function submitLabel(action: DialogAction) {
  if (action === "CONFIRM") return "Confirm appointment";
  if (action === "RESCHEDULE") return "Reschedule appointment";
  if (action === "CANCEL") return "Cancel appointment";
  if (action === "COMPLETE") return "Mark completed";
  if (action === "NO_SHOW") return "Mark no-show";
  return "Mark missed";
}

function OptionalReasonField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <AppFormField id={id} label={label} hint="Optional. This stays internal.">
      <AppInput id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </AppFormField>
  );
}

function ReasonField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
}) {
  return (
    <AppFormField id={id} label={label} required error={error}>
      <AppInput id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </AppFormField>
  );
}
