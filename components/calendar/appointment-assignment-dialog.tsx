"use client";

import { AppButton } from "@/components/app-button";
import { AppFormField } from "@/components/app-form-field";
import { AppSelect } from "@/components/app-select";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import type { AppointmentAssigneeOption, CalendarAppointment } from "@/types/appointment";

export function AppointmentAssignmentDialog({
  appointment,
  staff,
  value,
  loading,
  onValueChange,
  onOpenChange,
  onSubmit,
}: {
  appointment: CalendarAppointment | null;
  staff: AppointmentAssigneeOption[];
  value: string;
  loading?: boolean;
  onValueChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}) {
  const open = Boolean(appointment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-[0_24px_80px_rgba(20,35,27,0.22)]">
          <DialogTitle className="text-lg font-bold">Assign staff</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose the business member responsible for this appointment.
          </DialogDescription>

          <div className="mt-5">
            <AppFormField id="appointment-assign-staff" label="Assigned staff">
              <AppSelect
                id="appointment-assign-staff"
                value={value || "unassigned"}
                onValueChange={(next) => onValueChange(next === "unassigned" ? "" : next)}
                disabled={loading}
                options={[
                  { value: "unassigned", label: "Unassigned", description: "Confirm assignment later" },
                  ...staff.map((member) => ({ value: member.id, label: member.name, description: member.email ?? member.role })),
                ]}
              />
            </AppFormField>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</AppButton>
            <AppButton type="button" onClick={onSubmit} loading={loading} loadingText="Saving" disabled={loading || staff.length === 0}>
              Save assignment
            </AppButton>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
