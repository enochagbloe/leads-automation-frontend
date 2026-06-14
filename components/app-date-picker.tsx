"use client";

import { format, isValid, parseISO } from "date-fns";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { dateMatchModifiers, type Matcher } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function parseDateValue(value?: string | null) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

export function formatDateValue(value?: Date) {
  return value && isValid(value) ? format(value, "yyyy-MM-dd") : "";
}

export interface AppDatePickerProps {
  id?: string;
  name?: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
  displayFormat?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  error?: boolean;
  disabledDates?: Matcher | Matcher[];
  startMonth?: Date;
  endMonth?: Date;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export function AppDatePicker({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder = "Select date",
  displayFormat = "PPP",
  disabled,
  required,
  clearable = true,
  error,
  disabledDates,
  startMonth,
  endMonth,
  className,
  contentClassName,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: AppDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = useMemo(() => value && isValid(value) ? format(value, displayFormat) : null, [displayFormat, value]);
  const todayDisabled = disabledDates ? dateMatchModifiers(new Date(), disabledDates) : false;
  const selectDate = (date: Date | undefined) => {
    onChange?.(date);
    if (date) setOpen(false);
  };

  return (
    <>
      {name && <input type="hidden" name={name} value={formatDateValue(value)} />}
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <PopoverTrigger asChild>
            <button
              id={id}
              type="button"
              disabled={disabled}
              aria-label={ariaLabel}
              aria-describedby={ariaDescribedBy}
              aria-haspopup="dialog"
              data-required={required || undefined}
              onBlur={onBlur}
              className={cn(
                "flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-card px-3 text-left text-base outline-none transition-[border-color,box-shadow,background-color] duration-200 hover:bg-muted/45 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                !selectedLabel && "text-muted-foreground",
                clearable && value ? "pr-20" : "pr-10",
                error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                className,
              )}
            >
              <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{selectedLabel ?? placeholder}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={() => onChange?.(undefined)}
              className="absolute right-10 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear selected date"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <PopoverContent align="start" className={cn("w-auto p-0", contentClassName)}>
          <Calendar
            mode="single"
            selected={value}
            onSelect={selectDate}
            disabled={disabledDates}
            startMonth={startMonth}
            endMonth={endMonth}
            defaultMonth={value}
            autoFocus
          />
          <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
            <button type="button" disabled={todayDisabled} onClick={() => selectDate(new Date())} className="min-h-9 rounded-md px-2 text-xs font-semibold text-primary outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">Today</button>
            {clearable && value && <button type="button" onClick={() => selectDate(undefined)} className="min-h-9 rounded-md px-2 text-xs font-semibold text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">Clear date</button>}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

export interface AppIsoDatePickerProps extends Omit<AppDatePickerProps, "value" | "onChange"> {
  value?: string | null;
  onChange?: (value: string) => void;
}

export function AppIsoDatePicker({ value, onChange, ...props }: AppIsoDatePickerProps) {
  return <AppDatePicker value={parseDateValue(value)} onChange={(date) => onChange?.(formatDateValue(date))} {...props} />;
}
