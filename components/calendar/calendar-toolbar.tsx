import { CalendarPlus, Search } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppSelect } from "@/components/app-select";
import { CalendarDateJump } from "@/components/calendar/calendar-date-jump";
import { CalendarDayStrip } from "@/components/calendar/calendar-day-strip";
import { CalendarMissedDayInsight } from "@/components/calendar/calendar-month-insight";
import type { AppointmentAssigneeOption } from "@/types/appointment";

export function CalendarToolbar({
  selectedDate,
  canCreate,
  staff,
  staffFilter,
  markedDateKeys,
  missedSelectedDay,
  onDateChange,
  onStaffFilterChange,
  onCreate,
}: {
  selectedDate: Date;
  canCreate: boolean;
  staff: AppointmentAssigneeOption[];
  staffFilter: string;
  markedDateKeys?: string[];
  missedSelectedDay: number;
  onDateChange: (date: Date) => void;
  onStaffFilterChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <CalendarDateJump selectedDate={selectedDate} markedDateKeys={markedDateKeys} onDateChange={onDateChange} />
          <CalendarDayStrip selectedDate={selectedDate} onDateChange={onDateChange} className="flex-1 justify-start lg:justify-center" />
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <CalendarMissedDayInsight missedCount={missedSelectedDay} />
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
