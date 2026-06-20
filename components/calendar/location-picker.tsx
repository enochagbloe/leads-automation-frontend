"use client";

import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import type { AppointmentLocationType } from "@/types/appointment";

export const LOCATION_LABELS: Record<AppointmentLocationType, string> = {
  BUSINESS_LOCATION: "Business location",
  CUSTOMER_LOCATION: "Customer location",
  ONLINE: "Online",
  PHONE_CALL: "Phone call",
  TO_BE_CONFIRMED: "To be confirmed",
};

export function LocationPicker({
  value,
  location,
  error,
  onChange,
  onLocationChange,
}: {
  value: AppointmentLocationType;
  location: string;
  error?: string;
  onChange: (value: AppointmentLocationType) => void;
  onLocationChange: (value: string) => void;
}) {
  const customLabel = value === "ONLINE" ? "Meeting link" : value === "PHONE_CALL" ? "Phone call details" : "Location details";

  return (
    <div className="space-y-3">
      <AppFormField id="appointment-location-type" label="Location" required error={error}>
        <AppSelect
          id="appointment-location-type"
          value={value}
          onValueChange={(next) => onChange(next as AppointmentLocationType)}
          options={(Object.keys(LOCATION_LABELS) as AppointmentLocationType[]).map((type) => ({ value: type, label: LOCATION_LABELS[type] }))}
        />
      </AppFormField>
      {value === "TO_BE_CONFIRMED" && <p className="rounded-xl border bg-secondary/60 px-3 py-2 text-xs leading-5 text-primary">A team member will confirm the exact location later. The appointment will be marked as needing human confirmation.</p>}
      {["BUSINESS_LOCATION", "CUSTOMER_LOCATION", "ONLINE"].includes(value) && (
        <AppFormField id="appointment-location" label={customLabel} hint="Optional for now. Leave blank if the team should confirm it later.">
          <AppInput id="appointment-location" value={location} onChange={(event) => onLocationChange(event.target.value)} placeholder={value === "ONLINE" ? "https://meet.example.com/..." : "Enter address or location note"} />
        </AppFormField>
      )}
    </div>
  );
}
