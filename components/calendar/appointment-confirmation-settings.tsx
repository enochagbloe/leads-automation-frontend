"use client";

import { LockKeyhole, Sparkles } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { cn } from "@/lib/utils";
import type { AppointmentConfirmationMode } from "@/types/appointment";
import type { PlanCode } from "@/types/subscription";

const MODES: Array<{
  value: AppointmentConfirmationMode;
  label: string;
  description: string;
  minimumPlan: PlanCode;
}> = [
  {
    value: "MANUAL_CONFIRMATION_REQUIRED",
    label: "Manual confirmation required",
    description: "Team members confirm appointment requests before they become active.",
    minimumPlan: "BASIC",
  },
  {
    value: "AUTO_CONFIRM_WHEN_STAFF_ASSIGNED",
    label: "Auto-confirm when staff is assigned",
    description: "When a staff member is assigned and the booking is safe, BizReply can confirm it automatically.",
    minimumPlan: "PLUS",
  },
  {
    value: "AUTO_CONFIRM_SAFE_BOOKINGS",
    label: "Auto-confirm safe bookings",
    description: "BizReply confirms appointments when service, time, location, availability, and policies are safe. Risky appointments still need review.",
    minimumPlan: "PREMIUM",
  },
];

function planAllows(plan: PlanCode, required: PlanCode) {
  const order: Record<PlanCode, number> = { BASIC: 0, PLUS: 1, PREMIUM: 2 };
  return order[plan] >= order[required];
}

export function AppointmentConfirmationSettings({
  plan,
  value,
  loading,
  error,
  updating,
  className,
  onChange,
}: {
  plan: PlanCode;
  value: AppointmentConfirmationMode;
  loading?: boolean;
  error?: boolean;
  updating?: boolean;
  className?: string;
  onChange: (value: AppointmentConfirmationMode) => void;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-sm", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-bold">Appointment confirmation</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose how BizReply confirms appointments for this business.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{helperCopy(plan)}</p>
          {error && (
            <p className="mt-1 text-xs leading-5 text-warning">
              Confirmation settings are temporarily unavailable. Calendar actions still work.
            </p>
          )}
        </div>
        {plan !== "PREMIUM" && (
          <p className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
            Upgrade to Premium for safe auto-confirm
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-3">
        {MODES.map((mode) => {
          const locked = !planAllows(plan, mode.minimumPlan);
          const active = value === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              disabled={error || loading || updating || locked || active}
              onClick={() => onChange(mode.value)}
              className={cn(
                "min-h-24 rounded-xl border bg-background p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active && "border-primary bg-secondary/70",
                !active && !locked && "hover:border-primary/35 hover:bg-muted/45",
                locked && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{mode.label}</span>
                {locked && <LockKeyhole className="size-3.5 text-muted-foreground" />}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{mode.description}</span>
              {locked && (
                <span className="mt-2 inline-flex rounded-full border bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {mode.minimumPlan}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {updating && (
        <div className="mt-3 flex justify-end">
          <AppButton size="sm" loading loadingText="Saving" disabled>Saving</AppButton>
        </div>
      )}
    </section>
  );
}

function helperCopy(plan: PlanCode) {
  if (plan === "BASIC") return "Upgrade to Premium to enable safe automatic appointment confirmation.";
  if (plan === "PLUS") return "Upgrade to Premium to auto-confirm safe appointments even when staff assignment is not required.";
  return "Premium can auto-confirm safe bookings while routing risky appointments to human review.";
}
