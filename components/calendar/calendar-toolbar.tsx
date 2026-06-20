import { addDays, subDays } from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppSelect } from "@/components/app-select";
import type { AppointmentAssigneeOption } from "@/types/appointment";

export function CalendarToolbar({
  selectedDate,
  canCreate,
  staff,
  staffFilter,
  onDateChange,
  onStaffFilterChange,
  onCreate,
}: {
  selectedDate: Date;
  canCreate: boolean;
  staff: AppointmentAssigneeOption[];
  staffFilter: string;
  onDateChange: (date: Date) => void;
  onStaffFilterChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AppButton size="icon" variant="outline" onClick={() => onDateChange(subDays(selectedDate, 1))} aria-label="Previous day"><ChevronLeft className="size-4" /></AppButton>
          <AppButton variant="outline" onClick={() => onDateChange(new Date())}>Today</AppButton>
          <AppButton size="icon" variant="outline" onClick={() => onDateChange(addDays(selectedDate, 1))} aria-label="Next day"><ChevronRight className="size-4" /></AppButton>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="w-48">
            <AppSelect
              aria-label="Filter appointments by staff"
              value={staffFilter}
              onValueChange={onStaffFilterChange}
              options={[
                { value: "all", label: "All staff" },
                { value: "unassigned", label: "Unassigned" },
                ...staff.map((member) => ({ value: member.id, label: member.name, description: member.email ?? member.role })),
              ]}
            />
          </div>
          <AppButton size="icon" variant="outline" aria-label="Search appointments"><Search className="size-4" /></AppButton>
          {canCreate && <AppButton onClick={onCreate}><CalendarPlus className="size-4" />Create</AppButton>}
        </div>
      </div>
    </div>
  );
}
