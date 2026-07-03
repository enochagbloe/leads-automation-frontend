"use client";

import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { cn } from "@/lib/utils";
import type { PlanCode } from "@/types/subscription";

function planCopy(plan: PlanCode, canManageBilling?: boolean) {
  if (plan === "PREMIUM") {
    return "Premium can auto-confirm eligible low-risk appointments while keeping unclear requests in human review.";
  }

  if (!canManageBilling) {
    return "AI appointment auto-confirmation is available on Premium. Contact your organization to upgrade this feature.";
  }

  if (plan === "PLUS") {
    return "AI appointment auto-confirmation is available on Premium. Your current plan can create and route appointment requests, but confirmation still requires human approval.";
  }

  return "AI appointment auto-confirmation is available on Premium. Upgrade to allow AI to safely confirm eligible appointments automatically.";
}

export function AppointmentConfirmationSettings({
  plan,
  enabled,
  loading,
  error,
  updating,
  canManage,
  canManageBilling,
  className,
  onChange,
}: {
  plan: PlanCode;
  enabled: boolean;
  loading?: boolean;
  error?: boolean;
  updating?: boolean;
  canManage: boolean;
  canManageBilling?: boolean;
  className?: string;
  onChange: (enabled: boolean) => void;
}) {
  const premium = plan === "PREMIUM";
  const disabled = loading || updating || error || !premium || !canManage;

  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-sm", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-base font-bold">AI appointment auto-confirmation</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            When enabled, BizReply AI can automatically confirm eligible low-risk appointment requests after checking service rules,
            availability, staff, conflicts, and confidence.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{planCopy(plan, canManageBilling)}</p>
          {premium && !canManage && (
            <p className="mt-3 rounded-xl border bg-muted/55 px-3 py-2 text-xs font-semibold leading-5 text-muted-foreground">
              You can view this setting, but you do not have permission to manage AI appointment automation.
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold leading-5 text-warning">
              Auto-confirmation settings are temporarily unavailable. Calendar actions still work.
            </p>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={disabled}
          onClick={() => onChange(!enabled)}
          className={cn(
            "flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl border px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-64",
            enabled ? "border-primary bg-secondary text-primary" : "bg-background",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <span>
            <span className="block text-sm font-bold">{enabled ? "Enabled" : "Disabled"}</span>
            <span className="block text-xs text-muted-foreground">{enabled ? "AI may confirm safe requests" : "Human confirmation required"}</span>
          </span>
          <span className={cn("flex h-6 w-11 items-center rounded-full p-1 transition-colors", enabled ? "bg-primary" : "bg-muted")}>
            <span className={cn("size-4 rounded-full bg-white shadow-sm transition-transform", enabled && "translate-x-5")} />
          </span>
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-background p-4">
          <ShieldCheck className="size-4 text-primary" />
          <h3 className="mt-3 text-sm font-bold">Backend safety remains final</h3>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">The frontend never forces confirmation. BizReply only displays what the API decides.</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <Sparkles className="size-4 text-primary" />
          <h3 className="mt-3 text-sm font-bold">Only eligible services qualify</h3>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Simple, predictable services with duration, pricing, availability, and clear rules work best.</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <LockKeyhole className="size-4 text-primary" />
          <h3 className="mt-3 text-sm font-bold">Risky requests stay pending</h3>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Location, payment, staff, conflict, or low-confidence issues still require human review.</p>
        </div>
      </div>

      {updating && (
        <div className="mt-4 flex justify-end">
          <AppButton size="sm" loading loadingText="Saving" disabled>Saving</AppButton>
        </div>
      )}
    </section>
  );
}
