"use client";

import { Check, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";
import { AppButton } from "@/components/app-button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SettingsSectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-start sm:justify-between lg:px-7", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
        <h2 className="mt-1 font-sora text-2xl font-bold tracking-[-0.03em] text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SettingsPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-4 px-5 py-5 lg:px-7", className)}>{children}</div>;
}

export function SettingsCard({ children, className }: { children: ReactNode; className?: string }) {
  return <Card className={cn("border-border/80 bg-card/95 p-4 shadow-none", className)}>{children}</Card>;
}

export function SettingRow({
  title,
  description,
  children,
  locked,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  locked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/70 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-foreground">{title}</p>
          {locked && <LockKeyhole className="size-3.5 text-muted-foreground" aria-label="Locked" />}
        </div>
        {description && <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "success" && "bg-success/10 text-success",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "danger" && "bg-destructive/10 text-destructive",
        tone === "primary" && "bg-secondary text-primary",
      )}
    >
      {children}
    </span>
  );
}

export function ToggleSwitch({
  checked,
  disabled,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-7 w-12 rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-primary bg-primary" : "border-border bg-muted",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-1 grid size-5 place-items-center rounded-full bg-card text-primary shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-1",
        )}
      >
        {checked && <Check className="size-3" aria-hidden />}
      </span>
    </button>
  );
}

export function SettingsEmpty({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid min-h-[320px] place-items-center px-6 py-10 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <Icon className="size-6" />
        </span>
        <h3 className="mt-4 text-base font-bold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {actionLabel && <AppButton className="mt-5" onClick={onAction}>{actionLabel}</AppButton>}
      </div>
    </div>
  );
}
