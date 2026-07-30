"use client";

import { useIsMutating } from "@tanstack/react-query";
import { AlertTriangle, Check, LockKeyhole, RefreshCcw, ShieldCheck, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppButton } from "@/components/app-button";
import { AppErrorState } from "@/components/app-error-state";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SettingsCard,
  SettingsPanel,
  SettingsSectionHeader,
  StatusPill,
  ToggleSwitch,
} from "@/components/settings/settings-primitives";
import {
  useFollowUpJobs,
  followUpMutationKeys,
  useFollowUpPrompt,
  useFollowUpRules,
  useFollowUpSettings,
  useSaveFollowUpPrompt,
  useUpdateFollowUpRule,
  useUpdateFollowUpSettings,
} from "@/hooks/use-follow-up";
import { useCurrentSubscription } from "@/hooks/use-subscription";
import { useWhatsAppStatus } from "@/hooks/use-whatsapp";
import { getApiErrorMessage } from "@/lib/api-client";
import { systemNotify } from "@/lib/system-notifications";
import { PLAN_CATALOG, formatPlanLimit } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { getWorkspacePermissions } from "@/lib/workspace-permissions";
import type { AuthProfile } from "@/types/auth";
import type { FollowUpJob, FollowUpListResponse, FollowUpRule, FollowUpRuleType, UpdateFollowUpRuleInput } from "@/types/follow-up";

const ruleLabels: Record<FollowUpRuleType, { title: string; description: string }> = {
  NO_RESPONSE_AFTER_MESSAGE: {
    title: "General no-response",
    description: "Checks whether the customer still needs help after a staff reply.",
  },
  CONTACT_EMAIL_REQUEST: {
    title: "Missing customer detail",
    description: "Asks for a useful missing detail such as an email when the workflow needs it.",
  },
  BEFORE_APPOINTMENT: {
    title: "Appointment reminder",
    description: "Reminds customers before a scheduled appointment.",
  },
  AFTER_APPOINTMENT: {
    title: "Post-appointment follow-up",
    description: "Checks in after an appointment so the team can capture outcomes or issues.",
  },
  STALE_LEAD: {
    title: "Stale lead follow-up",
    description: "Reaches out when a lead has gone quiet for a longer period.",
  },
};

const delayOptions = [
  { value: "0", label: "Immediately" },
  { value: "30", label: "30 minutes" },
  { value: "120", label: "2 hours" },
  { value: "1440", label: "1 day" },
  { value: "2880", label: "2 days" },
  { value: "4320", label: "3 days" },
  { value: "10080", label: "1 week" },
];

const planOrder = { BASIC: 1, PLUS: 2, PREMIUM: 3 } as const;

const delayUnits = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
] satisfies { value: string; label: string }[];

type DelayUnit = "minutes" | "hours" | "days";
const MAX_CUSTOM_DELAY_MINUTES = 365 * 24 * 60;

function attemptOptionsForRule(currentPlan: string | null | undefined, type: FollowUpRuleType) {
  const maxPreset = maximumAttemptsForRule(currentPlan, type);
  return Array.from({ length: maxPreset }, (_, index) => {
    const value = index + 1;
    return { value: String(value), label: `${value} ${value === 1 ? "attempt" : "attempts"}` };
  });
}

function maximumAttemptsForRule(currentPlan: string | null | undefined, type: FollowUpRuleType) {
  void type;
  if (currentPlan === "BASIC") return 1;
  if (currentPlan === "PLUS") return 2;
  return 3;
}

function canUsePremiumCustomization(currentPlan?: string | null) {
  return currentPlan === "PREMIUM";
}

function minutesFromDelayValue(value: number, unit: DelayUnit) {
  if (unit === "days") return value * 1440;
  if (unit === "hours") return value * 60;
  return value;
}

function maximumDelayValue(unit: DelayUnit) {
  if (unit === "days") return 365;
  if (unit === "hours") return 365 * 24;
  return MAX_CUSTOM_DELAY_MINUTES;
}

function clampDelayValue(value: number, unit: DelayUnit) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(maximumDelayValue(unit), Math.max(1, Math.trunc(value)));
}

function clampAttemptValue(value: number, maximumAttempts: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(maximumAttempts, Math.max(1, Math.trunc(value)));
}

function bestDelayUnit(minutes: number): DelayUnit {
  if (minutes >= 1440 && minutes % 1440 === 0) return "days";
  if (minutes >= 60 && minutes % 60 === 0) return "hours";
  return "minutes";
}

function delayValueForUnit(minutes: number, unit: DelayUnit) {
  if (unit === "days") return Math.max(1, Math.round(minutes / 1440));
  if (unit === "hours") return Math.max(1, Math.round(minutes / 60));
  return Math.max(1, minutes);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function planTone(currentPlan?: string | null, requiredPlan?: string | null) {
  if (!requiredPlan || !currentPlan) return "neutral" as const;
  return planOrder[currentPlan as keyof typeof planOrder] >= planOrder[requiredPlan as keyof typeof planOrder] ? "success" as const : "warning" as const;
}

function planRequirementLabel(currentPlan?: string | null, requiredPlan?: FollowUpRule["planRequired"]) {
  if (!requiredPlan) return null;
  const tone = planTone(currentPlan, requiredPlan);
  if (tone === "warning") return `Requires ${PLAN_CATALOG[requiredPlan].name}`;
  if (currentPlan && currentPlan !== requiredPlan) return "Included";
  return PLAN_CATALOG[requiredPlan].name;
}

function normalizeRule(rule: FollowUpRule): UpdateFollowUpRuleInput {
  return {
    name: rule.name,
    description: rule.description ?? null,
    enabled: rule.enabled,
    delayMinutes: rule.delayMinutes,
    messageTemplate: rule.messageTemplate,
    useAiRewrite: rule.useAiRewrite,
    maxSendsPerLead: rule.maxSendsPerLead,
    maxSendsPerConversation: rule.maxSendsPerConversation,
    cooldownMinutes: rule.cooldownMinutes ?? null,
    onlyDuringBusinessHours: rule.onlyDuringBusinessHours,
  };
}

function mergedDraft(rule: FollowUpRule, patches: Record<string, UpdateFollowUpRuleInput>) {
  return { ...normalizeRule(rule), ...(patches[rule.id] ?? {}) };
}

function enforceRuleInputLimits(
  rule: FollowUpRule,
  input: UpdateFollowUpRuleInput,
  currentPlan?: string | null,
): UpdateFollowUpRuleInput {
  const maximumAttempts = maximumAttemptsForRule(currentPlan, rule.type);
  return {
    ...input,
    delayMinutes: Math.min(
      MAX_CUSTOM_DELAY_MINUTES,
      Math.max(0, Math.trunc(input.delayMinutes ?? rule.delayMinutes)),
    ),
    maxSendsPerLead: Math.min(
      maximumAttempts,
      clampAttemptValue(input.maxSendsPerLead ?? rule.maxSendsPerLead, maximumAttempts),
    ),
    maxSendsPerConversation: Math.min(
      maximumAttempts,
      clampAttemptValue(input.maxSendsPerConversation ?? rule.maxSendsPerConversation, maximumAttempts),
    ),
  };
}

function rulesChanged(original: FollowUpRule[], patches: Record<string, UpdateFollowUpRuleInput>) {
  return original.filter((rule) => {
    const draft = mergedDraft(rule, patches);
    const base = normalizeRule(rule);
    return JSON.stringify(base) !== JSON.stringify(draft);
  });
}

function selectedDelayLabel(minutes?: number | null) {
  return delayOptions.find((option) => option.value === String(minutes ?? ""))?.label ?? `${minutes ?? 0} minutes`;
}

function selectedAttemptLabel(attempts?: number | null) {
  const count = attempts ?? 1;
  return `${count} ${count === 1 ? "attempt" : "attempts"}`;
}

function RuleEditor({
  rule,
  draft,
  canEdit,
  currentPlan,
  onChange,
}: {
  rule: FollowUpRule;
  draft: UpdateFollowUpRuleInput;
  canEdit: boolean;
  currentPlan?: string | null;
  onChange: (value: UpdateFollowUpRuleInput) => void;
}) {
  const copy = ruleLabels[rule.type] ?? { title: rule.name, description: rule.description ?? "Business follow-up workflow." };
  const locked = planTone(currentPlan, rule.planRequired) === "warning";
  const requirementLabel = planRequirementLabel(currentPlan, rule.planRequired);
  const businessHoursOnly = Boolean(draft.onlyDuringBusinessHours);
  const premiumCustom = canUsePremiumCustomization(currentPlan);
  const selectedDelay = draft.delayMinutes ?? rule.delayMinutes;
  const selectedAttempts = draft.maxSendsPerConversation ?? rule.maxSendsPerConversation;
  const presetDelayValue = delayOptions.some((option) => option.value === String(selectedDelay)) ? String(selectedDelay) : "custom";
  const attemptSelectOptions = attemptOptionsForRule(currentPlan, rule.type);
  const maximumAttempts = attemptSelectOptions.length;
  const safeSelectedAttempts = Math.min(maximumAttempts, Math.max(1, selectedAttempts));
  const [delayMode, setDelayMode] = useState<"preset" | "custom">(premiumCustom && presetDelayValue === "custom" ? "custom" : "preset");
  const [delayUnit, setDelayUnit] = useState<DelayUnit>(bestDelayUnit(selectedDelay));
  const delaySelectOptions = premiumCustom ? [...delayOptions, { value: "custom", label: "Custom delay" }] : delayOptions;

  return (
    <SettingsCard className={cn("border-0 bg-transparent p-0", locked && "bg-muted/30")}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold">{copy.title}</h3>
            <StatusPill tone={draft.enabled ? "success" : "neutral"}>{draft.enabled ? "Enabled" : "Disabled"}</StatusPill>
            {requirementLabel && <StatusPill tone={planTone(currentPlan, rule.planRequired)}>{requirementLabel}</StatusPill>}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.description}</p>
          <p className="mt-2 text-xs font-semibold text-foreground/75">
            Runs after {selectedDelayLabel(draft.delayMinutes)} · Up to {selectedAttemptLabel(safeSelectedAttempts)} · {businessHoursOnly ? "Business hours only" : "Any time"}
          </p>
          {locked && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-warning"><LockKeyhole className="size-3.5" />Requires {PLAN_CATALOG[rule.planRequired!].name}</p>}
        </div>
        <ToggleSwitch
          checked={Boolean(draft.enabled)}
          disabled={!canEdit || locked}
          onCheckedChange={(enabled) => onChange({ ...draft, enabled })}
          label={`Toggle ${copy.title}`}
          className="border-0"
        />
      </div>
      <div className="mt-1 grid gap-4 rounded-xl bg-muted/35 p-4 md:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-xs font-bold">Delay</span>
          <AppSelect
            value={delayMode === "custom" ? "custom" : presetDelayValue}
            disabled={!canEdit || locked}
            onValueChange={(value) => {
              if (value === "custom") {
                setDelayMode("custom");
                return;
              }
              setDelayMode("preset");
              onChange({ ...draft, delayMinutes: Number(value) });
            }}
            options={delaySelectOptions}
            placeholder="Choose delay"
            className="h-10 border-0 bg-card text-sm shadow-none"
            contentClassName="border-0"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-bold">Attempts per conversation</span>
          <AppSelect
            value={String(safeSelectedAttempts)}
            disabled={!canEdit || locked}
            onValueChange={(value) => {
              onChange({ ...draft, maxSendsPerConversation: Number(value), maxSendsPerLead: Number(value) });
            }}
            options={attemptSelectOptions}
            placeholder="Attempts"
            className="h-10 border-0 bg-card text-sm shadow-none"
            contentClassName="border-0"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            aria-pressed={businessHoursOnly}
            disabled={!canEdit || locked}
            onClick={() => onChange({ ...draft, onlyDuringBusinessHours: !businessHoursOnly })}
            className={cn(
              "flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border-0 bg-card px-3 text-left text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
              businessHoursOnly ? "bg-secondary text-primary" : "hover:bg-muted/45",
            )}
          >
            <span>
              Business hours only
              <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
                {businessHoursOnly ? "Selected" : "Off"}
              </span>
            </span>
            <span className={cn("grid size-5 place-items-center rounded-md", businessHoursOnly ? "bg-primary text-primary-foreground" : "bg-muted text-transparent")}>
              <Check className="size-3.5" aria-hidden />
            </span>
          </button>
        </div>
        {premiumCustom && delayMode === "custom" && (
          <div className="grid gap-3 rounded-xl bg-card p-4 md:col-span-3">
            {delayMode === "custom" && (
              <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold">Custom delay</span>
                  <AppInput
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={maximumDelayValue(delayUnit)}
                    value={delayValueForUnit(selectedDelay, delayUnit)}
                    disabled={!canEdit || locked}
                    onChange={(event) => {
                      const value = clampDelayValue(Number(event.target.value || 1), delayUnit);
                      onChange({ ...draft, delayMinutes: minutesFromDelayValue(value, delayUnit) });
                    }}
                  className="h-10 border-0 bg-muted/45 text-sm shadow-none"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-bold">Unit</span>
                  <AppSelect
                    value={delayUnit}
                    disabled={!canEdit || locked}
                    onValueChange={(value) => {
                      const nextUnit = value as DelayUnit;
                      const currentValue = clampDelayValue(
                        delayValueForUnit(selectedDelay, delayUnit),
                        nextUnit,
                      );
                      setDelayUnit(nextUnit);
                      onChange({ ...draft, delayMinutes: minutesFromDelayValue(currentValue, nextUnit) });
                    }}
                  options={delayUnits}
                  className="h-10 border-0 bg-muted/45 text-sm shadow-none"
                  contentClassName="border-0"
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </SettingsCard>
  );
}

export function FollowUpSettingsSection({
  profile,
  onDirtyChange,
}: {
  profile: AuthProfile;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const businessId = profile.activeBusiness?.id;
  const permissions = getWorkspacePermissions(profile);
  const canEdit = profile.membership?.role === "BUSINESS_OWNER" || permissions.canManageBusinessSettings || permissions.canManageAiSettings;
  const subscription = useCurrentSubscription(Boolean(profile.subscription && profile.plan));
  const settings = useFollowUpSettings(businessId);
  const rules = useFollowUpRules(businessId);
  const jobs = useFollowUpJobs(businessId);
  const prompt = useFollowUpPrompt(businessId);
  const whatsapp = useWhatsAppStatus(businessId);
  const updateSettings = useUpdateFollowUpSettings(businessId);
  const updateRule = useUpdateFollowUpRule(businessId);
  const savePrompt = useSaveFollowUpPrompt(businessId);
  const pendingFollowUpSaves = useIsMutating({ mutationKey: followUpMutationKeys.business(businessId ?? "") });
  const [enabledOverride, setEnabledOverride] = useState<boolean | null>(null);
  const [rulePatches, setRulePatches] = useState<Record<string, UpdateFollowUpRuleInput>>({});
  const [savedRuleOverrides, setSavedRuleOverrides] = useState<Record<string, UpdateFollowUpRuleInput>>({});
  const [savedEnabledOverride, setSavedEnabledOverride] = useState<boolean | null>(null);
  const [promptOverride, setPromptOverride] = useState<string | null>(null);
  const [backgroundSaving, setBackgroundSaving] = useState(false);

  const activePrompt = prompt.data?.data[0];
  const activeVersion = activePrompt?.activeVersion ?? activePrompt?.versions?.[0] ?? null;
  const enabled = enabledOverride ?? savedEnabledOverride ?? settings.data?.followUpAutomationEnabled ?? false;
  const promptText = promptOverride ?? activeVersion?.promptText ?? "";
  const whatsappConnected = whatsapp.data?.status === "CONNECTED";
  const currentPlan = subscription.data?.plan.code ?? profile.plan?.code;
  const jobResponse = jobs.data as FollowUpListResponse<FollowUpJob> | undefined;
  const ruleResponse = rules.data as FollowUpListResponse<FollowUpRule> | undefined;
  const activeJobs = jobResponse?.data.filter((job) => ["SCHEDULED", "PROCESSING"].includes(job.status)) ?? [];
  const originalRules = useMemo(
    () => (ruleResponse?.data ?? []).map((rule) => ({ ...rule, ...(savedRuleOverrides[rule.id] ?? {}) })),
    [ruleResponse?.data, savedRuleOverrides],
  );
  const changedRules = useMemo(() => rulesChanged(originalRules, rulePatches), [rulePatches, originalRules]);
  const settingsDirty = Boolean(settings.data && settings.data.followUpAutomationEnabled !== enabled);
  const promptDirty = Boolean(activeVersion && promptText.trim() !== activeVersion.promptText.trim()) || Boolean(!activeVersion && promptText.trim());
  const dirty = settingsDirty || changedRules.length > 0 || promptDirty;
  const savingInBackground = backgroundSaving || pendingFollowUpSaves > 0;
  const saving = updateSettings.isPending || updateRule.isPending || savePrompt.isPending || pendingFollowUpSaves > 0;
  const shouldBlockNavigation = dirty && !savingInBackground;

  useEffect(() => {
    onDirtyChange?.(shouldBlockNavigation);
  }, [onDirtyChange, shouldBlockNavigation]);

  const discard = () => {
    setEnabledOverride(null);
    setRulePatches({});
    setPromptOverride(null);
  };

  const save = async () => {
    const settingsValueToSave = enabled;
    const rulesToSave = changedRules.map((rule) => ({
      rule,
      input: enforceRuleInputLimits(rule, mergedDraft(rule, rulePatches), currentPlan),
    }));
    try {
      if (settingsDirty) {
        if (!settingsValueToSave && activeJobs.length > 0 && !window.confirm(`Disable follow-up automation? ${activeJobs.length} active sequence${activeJobs.length === 1 ? "" : "s"} may be cancelled or paused based on backend policy.`)) return;
      }
      setBackgroundSaving(true);
      onDirtyChange?.(false);
      if (settingsDirty) {
        setSavedEnabledOverride(settingsValueToSave);
        await updateSettings.mutateAsync({ followUpAutomationEnabled: settingsValueToSave });
      }
      for (const { rule, input } of rulesToSave) {
        setSavedRuleOverrides((current) => ({ ...current, [rule.id]: input }));
        await updateRule.mutateAsync({ ruleId: rule.id, input });
      }
      if (promptDirty) {
        if (!promptText.trim()) throw new Error("Follow-up instructions cannot be empty.");
        await savePrompt.mutateAsync({ configurationId: activePrompt?.id, promptText: promptText.trim() });
      }
      discard();
      setBackgroundSaving(false);
    } catch (error) {
      if (settingsDirty) setSavedEnabledOverride(null);
      if (rulesToSave.length) {
        setSavedRuleOverrides((current) => {
          const next = { ...current };
          for (const { rule } of rulesToSave) delete next[rule.id];
          return next;
        });
      }
      setBackgroundSaving(false);
      onDirtyChange?.(dirty);
      systemNotify.error("Could not save follow-up settings", { description: getApiErrorMessage(error) });
    }
  };

  const usageLimit = subscription.data?.plan.limits.conversations ?? profile.limits.maxConversationsPerMonth;
  const usage = subscription.data?.businessUsage.conversations ?? profile.businessUsage.conversationsUsed;
  const usagePercent = usageLimit ? Math.min(100, Math.round((usage / usageLimit) * 100)) : 0;

  return (
    <>
      <SettingsSectionHeader
        eyebrow={profile.activeBusiness?.name}
        title="Follow-Up Automation"
        description="Control how BizReply follows up with customers when requests, appointments, or conversations remain unresolved."
        className="mx-auto w-full max-w-5xl border-b-0"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={enabled ? "success" : "neutral"}>{enabled ? "Automation on" : "Automation off"}</StatusPill>
            <StatusPill tone={whatsappConnected ? "success" : "warning"}>{whatsappConnected ? "WhatsApp connected" : "WhatsApp not connected"}</StatusPill>
          </div>
        }
      />

      <SettingsPanel className="mx-auto w-full max-w-5xl pb-24">
        {!businessId ? (
          <AppErrorState title="No active business" description="Select a business before managing follow-up automation." />
        ) : settings.isPending || rules.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        ) : settings.isError || rules.isError ? (
          <AppErrorState
            title="Could not load follow-up settings"
            description={getApiErrorMessage(settings.error ?? rules.error)}
            onRetry={() => { void settings.refetch(); void rules.refetch(); }}
          />
        ) : (
          <>
            <SettingsCard className="mx-auto w-full max-w-3xl border-0 bg-muted/30 px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                    <TimerReset className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold">Usage this period</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Conversations used from a limit of {formatPlanLimit(usageLimit ?? null)}.</p>
                  </div>
                </div>
                <p className="font-sora text-3xl font-bold tracking-[-0.04em]">{usage.toLocaleString("en-GH")}</p>
              </div>
              {usageLimit && <div className="mt-5 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} /></div>}
            </SettingsCard>

            <SettingsCard className="border-0 bg-transparent p-0">
              <div className="flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold">Enable Follow-Up Automation</p>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">Allow BizReply to schedule follow-ups using the active workflows below.</p>
                </div>
                <ToggleSwitch checked={enabled} disabled={!canEdit} onCheckedChange={setEnabledOverride} label="Enable Follow-Up Automation" className="border-0" />
              </div>
              <div className="mt-4 flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold">Current plan</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Your plan determines the available workflows and attempt limits.</p>
                </div>
                <StatusPill tone="primary">{currentPlan ? PLAN_CATALOG[currentPlan].name : "No active plan"}</StatusPill>
              </div>
              {!canEdit && (
                <p className="mt-5 flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-3 text-xs font-semibold text-warning">
                  <ShieldCheck className="size-4" />You can view these settings, but your role cannot change business-wide follow-up automation.
                </p>
              )}
            </SettingsCard>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold">Workflow rules</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Configure when each customer follow-up should run.</p>
                </div>
              </div>
              <div className="space-y-8">
                {originalRules.map((rule) => (
                  <RuleEditor
                    key={rule.id}
                    rule={rule}
                    draft={mergedDraft(rule, rulePatches)}
                    canEdit={canEdit}
                    currentPlan={currentPlan}
                    onChange={(value) => setRulePatches((current) => ({ ...current, [rule.id]: value }))}
                  />
                ))}
              </div>
            </section>

            <SettingsCard className="border-0 bg-transparent p-0 pt-3">
              <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">Follow-Up AI instructions</h3>
                    <StatusPill tone={activeVersion?.status === "ACTIVE" ? "success" : "neutral"}>{activeVersion?.status ?? "No active prompt"}</StatusPill>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">These instructions apply only to follow-up automation. Safety rules, opt-outs, subscription limits, appointment truth, and human takeover cannot be overridden.</p>
                  <textarea
                    value={promptText}
                    disabled={!canEdit || prompt.isPending}
                    onChange={(event) => setPromptOverride(event.target.value)}
                    rows={5}
                    placeholder="Keep follow-ups short and professional. Do not pressure customers..."
                    className="mt-4 w-full resize-none rounded-xl border-0 bg-muted/45 px-4 py-3 text-sm leading-6 outline-none transition focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Active version: {activeVersion?.versionNumber ? `v${activeVersion.versionNumber}` : "None"} · Last updated: {formatDateTime(activeVersion?.activatedAt ?? activeVersion?.updatedAt)}
                  </p>
              </div>
            </SettingsCard>
          </>
        )}
      </SettingsPanel>

      {(dirty || savingInBackground) && (
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 bg-card/95 px-5 py-3 backdrop-blur lg:px-7">
          <p className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex">
            {!savingInBackground && (
              <>
                <AlertTriangle className="size-4 text-warning" />You have unsaved follow-up changes.
              </>
            )}
          </p>
          <div className="ml-auto flex gap-2">
            <AppButton variant="outline" className="border-0 bg-muted" onClick={discard} disabled={saving}><RefreshCcw className="size-4" />Discard</AppButton>
            <AppButton onClick={save} loading={saving || backgroundSaving} loadingText="Saving">Save changes</AppButton>
          </div>
        </div>
      )}
    </>
  );
}
