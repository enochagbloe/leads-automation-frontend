"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { DayPicker, type DayPickerProps, type DropdownProps } from "react-day-picker";
import { cn } from "@/lib/utils";

function CalendarDropdown({ options, value, onChange, disabled, "aria-label": ariaLabel }: DropdownProps) {
  const selectedOption = options?.find((option) => option.value === value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={disabled}
        aria-label={ariaLabel}
        className="inline-flex h-8 min-w-20 items-center justify-between gap-2 rounded-lg bg-secondary px-2.5 text-xs font-extrabold text-secondary-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{selectedOption?.label ?? value}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="left"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="account-menu-content z-[130] max-h-64 min-w-[9rem] overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-[0_14px_40px_rgba(20,35,27,0.14)]"
        >
          {options?.map((option) => (
            <DropdownMenu.Item
              key={option.value}
              disabled={option.disabled}
              onSelect={() => {
                onChange?.({
                  target: { value: String(option.value) },
                  currentTarget: { value: String(option.value) },
                } as React.ChangeEvent<HTMLSelectElement>);
              }}
              className="relative flex min-h-9 cursor-pointer items-center rounded-lg px-3 pr-8 text-xs font-semibold outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-muted"
            >
              {option.label}
              {option.value === value && <Check className="absolute right-3 size-3.5 text-primary" aria-hidden="true" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function Calendar({ className, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown"
      navLayout="after"
      components={{ Dropdown: CalendarDropdown, ...props.components }}
      className={cn("app-calendar p-3", className)}
      {...props}
    />
  );
}
