"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AppSelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface AppSelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onBlur?: () => void;
  options: AppSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  size?: "default" | "large";
  className?: string;
  contentClassName?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export function AppSelect({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  onBlur,
  options,
  placeholder = "Select an option",
  disabled,
  required,
  error,
  size = "default",
  className,
  contentClassName,
  autoFocus,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: AppSelectProps) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select.Root
      name={name}
      value={value || undefined}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      required={required}
    >
      <Select.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={error || undefined}
        autoFocus={autoFocus}
        onBlur={onBlur}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-input bg-card px-3 text-left text-base text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-200 data-[placeholder]:text-muted-foreground hover:bg-muted/45 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          size === "large" ? "h-12" : "h-11",
          error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
          className,
        )}
      >
        <Select.Value placeholder={placeholder}>
          {selectedOption && (
            <span className="flex min-w-0 items-center gap-2">
              {selectedOption.icon && <span className="grid size-5 shrink-0 place-items-center text-muted-foreground" aria-hidden="true">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
            </span>
          )}
        </Select.Value>
        <Select.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            "app-select-content z-[100] max-h-[min(320px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-[0_14px_40px_rgba(20,35,27,0.14),0_2px_8px_rgba(20,35,27,0.06)]",
            contentClassName,
          )}
        >
          <Select.ScrollUpButton className="flex h-8 cursor-default items-center justify-center bg-popover text-muted-foreground">
            <ChevronUp className="size-4" aria-hidden="true" />
          </Select.ScrollUpButton>
          <Select.Viewport className="p-1.5">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-lg py-2 pl-3 pr-9 text-sm outline-none transition-colors duration-150 data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground"
              >
                {option.icon && <span className="grid size-5 shrink-0 place-items-center text-muted-foreground" aria-hidden="true">{option.icon}</span>}
                <Select.ItemText>
                  <span className="block font-medium">{option.label}</span>
                  {option.description && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{option.description}</span>}
                </Select.ItemText>
                <Select.ItemIndicator className="absolute right-3 grid size-5 place-items-center text-primary">
                  <Check className="size-4" aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="flex h-8 cursor-default items-center justify-center bg-popover text-muted-foreground">
            <ChevronDown className="size-4" aria-hidden="true" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
