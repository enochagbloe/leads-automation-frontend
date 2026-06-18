"use client";

import { X } from "lucide-react";
import { AppFormField } from "@/components/app-form-field";
import { AppSelect } from "@/components/app-select";
import type { AppointmentAssigneeOption } from "@/types/appointment";
import type { Lead } from "@/types/lead";

function leadLabel(lead?: Lead) {
  return lead ? `${lead.fullName}${lead.phone ? ` · ${lead.phone}` : ""}` : "";
}

export function PeopleSelector({
  leads,
  staff,
  leadId,
  staffId,
  loadingLeads,
  loadingStaff,
  leadError,
  staffError,
  onLeadChange,
  onStaffChange,
}: {
  leads: Lead[];
  staff: AppointmentAssigneeOption[];
  leadId: string;
  staffId: string;
  loadingLeads: boolean;
  loadingStaff: boolean;
  leadError?: string;
  staffError?: string;
  onLeadChange: (value: string) => void;
  onStaffChange: (value: string) => void;
}) {
  const selectedLead = leads.find((lead) => lead.id === leadId);
  const selectedStaff = staff.find((member) => member.id === staffId);

  return (
    <div className="space-y-4">
      <AppFormField id="appointment-lead" label="Customer / lead" required error={leadError}>
        <AppSelect
          id="appointment-lead"
          value={leadId}
          onValueChange={onLeadChange}
          placeholder={loadingLeads ? "Loading leads..." : "Select a customer"}
          disabled={loadingLeads}
          options={leads.map((lead) => ({ value: lead.id, label: lead.fullName, description: lead.email ?? lead.phone }))}
        />
      </AppFormField>
      {selectedLead && <SelectedChip label={leadLabel(selectedLead)} onRemove={() => onLeadChange("")} />}

      <AppFormField id="appointment-staff" label="Assigned staff / participants" error={staffError}>
        <AppSelect
          id="appointment-staff"
          value={staffId || "__unassigned"}
          onValueChange={(value) => onStaffChange(value === "__unassigned" ? "" : value)}
          placeholder={loadingStaff ? "Loading team..." : "Select assigned staff"}
          disabled={loadingStaff}
          options={[{ value: "__unassigned", label: "Unassigned", description: "Confirm assignment later" }, ...staff.map((member) => ({ value: member.id, label: member.name, description: member.email ?? member.role }))]}
        />
      </AppFormField>
      {selectedStaff && <SelectedChip label={selectedStaff.name} onRemove={() => onStaffChange("")} />}
    </div>
  );
}

function SelectedChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border bg-background px-3 text-xs font-semibold">
      <span className="grid size-6 place-items-center rounded-full bg-secondary text-[10px] font-bold text-primary">{label.slice(0, 2).toUpperCase()}</span>
      {label}
      <button type="button" onClick={onRemove} className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Remove ${label}`}>
        <X className="size-3" />
      </button>
    </span>
  );
}
