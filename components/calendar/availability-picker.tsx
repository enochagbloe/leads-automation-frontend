"use client";

import { format } from "date-fns";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { AppFormField } from "@/components/app-form-field";
import { AppIsoDatePicker } from "@/components/app-date-picker";
import { AppTimePicker } from "@/components/app-time-picker";
import type { AppointmentAvailabilityResponse } from "@/types/appointment";

export function AvailabilityPicker({
  date,
  time,
  dateError,
  timeError,
  availability,
  checking,
  onDateChange,
  onTimeChange,
}: {
  date: string;
  time: string;
  dateError?: string;
  timeError?: string;
  availability?: AppointmentAvailabilityResponse | null;
  checking: boolean;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <AppFormField id="appointment-date" label="Date" required error={dateError}>
          <AppIsoDatePicker id="appointment-date" value={date} onChange={onDateChange} clearable={false} />
        </AppFormField>
        <AppFormField id="appointment-time" label="Start time" required error={timeError}>
          <AppTimePicker id="appointment-time" value={time} onChange={onTimeChange} clearable={false} />
        </AppFormField>
      </div>
      <div className="rounded-xl border bg-background px-3 py-2.5 text-xs leading-5">
        {checking ? (
          <p className="text-muted-foreground">Checking availability...</p>
        ) : availability?.available ? (
          <p className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-4" />Available until {availability.endTime ? format(new Date(availability.endTime), "p") : "calculated end time"}</p>
        ) : availability?.available === false ? (
          <p className="flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="size-4" />{availability.message ?? "This time slot is not available. Choose another time."}</p>
        ) : (
          <p className="text-muted-foreground">Select a service, date, and time to check availability.</p>
        )}
      </div>
    </div>
  );
}
