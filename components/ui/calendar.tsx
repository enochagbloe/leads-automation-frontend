"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";

export function Calendar({ className, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout="after"
      className={cn("app-calendar p-3", className)}
      {...props}
    />
  );
}
