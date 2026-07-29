"use client";

import { AppDatePicker } from "@/components/app-date-picker";

export function CalendarDateJump({
  selectedDate,
  markedDateKeys,
  onDateChange,
}: {
  selectedDate: Date;
  markedDateKeys?: string[];
  onDateChange: (date: Date) => void;
}) {
  return (
    <div className="w-11 shrink-0">
      <AppDatePicker
        value={selectedDate}
        onChange={(date) => {
          if (date) onDateChange(date);
        }}
        clearable={false}
        displayFormat="MMM d"
        markedDateKeys={markedDateKeys}
        aria-label="Choose calendar date"
        className="grid size-10 w-10 place-items-center rounded-full border-0 bg-secondary/60 p-0 text-primary hover:bg-secondary focus-visible:ring-ring [&>span]:sr-only [&>svg:last-child]:hidden"
      />
    </div>
  );
}
