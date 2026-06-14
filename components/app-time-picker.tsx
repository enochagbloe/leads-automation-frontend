"use client";

import { Check, ChevronDown, Clock3, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const TIME_VALUE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function parts(value?: string) {
  if (!value || !TIME_VALUE.test(value)) return { hour: "", minute: "", period: "AM" as const };
  const [rawHour, minute] = value.split(":");
  const hour = Number(rawHour);
  return { hour: String(hour % 12 || 12).padStart(2, "0"), minute, period: hour >= 12 ? "PM" as const : "AM" as const };
}

function valueFromParts(hour: string, minute: string, period: "AM" | "PM") {
  if (!hour || !minute) return "";
  const displayHour = Number(hour);
  const hour24 = period === "PM" ? displayHour % 12 + 12 : displayHour % 12;
  return `${String(hour24).padStart(2, "0")}:${minute}`;
}

export function formatTimeValue(value?: string) {
  const current = parts(value);
  return current.hour && current.minute ? `${current.hour}:${current.minute} ${current.period}` : "";
}

export interface AppTimePickerProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  error?: boolean;
  minuteStep?: number;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export function AppTimePicker({
  id,
  name,
  value = "",
  onChange,
  onBlur,
  placeholder = "Select time",
  disabled,
  required,
  clearable = true,
  error,
  minuteStep = 5,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: AppTimePickerProps) {
  const [open, setOpen] = useState(false);
  const current = parts(value);
  const hours = useMemo(() => Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")), []);
  const minutes = useMemo(() => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, index) => String(index * minuteStep).padStart(2, "0")), [minuteStep]);
  const choose = (hour = current.hour, minute = current.minute, period = current.period) => onChange?.(valueFromParts(hour, minute, period));

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
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
                !value && "text-muted-foreground",
                clearable && value ? "pr-20" : "pr-10",
                error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                className,
              )}
            >
              <Clock3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{formatTimeValue(value) || placeholder}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          {clearable && value && !disabled && <button type="button" onClick={() => onChange?.("")} className="absolute right-10 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label="Clear selected time"><X className="size-3.5" /></button>}
        </div>
        <PopoverContent align="start" className="w-[min(310px,calc(100vw-2rem))] p-3">
          <div className="flex items-center justify-between gap-3 border-b pb-3"><div><p className="text-sm font-bold">Select time</p><p className="mt-0.5 text-xs text-muted-foreground">{formatTimeValue(value) || "Choose hour, minute, and period"}</p></div>{value && <span className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-bold text-primary">{value}</span>}</div>
          <div className="mt-3 grid grid-cols-[1fr_1fr_76px] gap-2">
            <TimeColumn label="Hour" values={hours} selected={current.hour} onSelect={(next) => choose(next)} />
            <TimeColumn label="Minute" values={minutes} selected={current.minute} onSelect={(next) => choose(current.hour || "08", next)} />
            <TimeColumn label="Period" values={["AM", "PM"]} selected={current.period} onSelect={(next) => choose(current.hour || "08", current.minute || "00", next as "AM" | "PM")} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3"><button type="button" onClick={() => onChange?.("")} disabled={!value} className="min-h-9 rounded-md px-2 text-xs font-semibold text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">Clear</button><button type="button" onClick={() => setOpen(false)} disabled={!value} className="min-h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">Done</button></div>
        </PopoverContent>
      </Popover>
    </>
  );
}

function TimeColumn({ label, values, selected, onSelect }: { label: string; values: string[]; selected: string; onSelect: (value: string) => void }) {
  return <div><p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><div className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-muted/50 p-1" role="listbox" aria-label={label}>{values.map((value) => <button key={value} type="button" role="option" aria-selected={selected === value} onClick={() => onSelect(value)} className={cn("flex min-h-9 w-full items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold outline-none transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring", selected === value && "bg-primary text-primary-foreground hover:bg-primary")} >{selected === value && <Check className="size-3" />}{value}</button>)}</div></div>;
}
