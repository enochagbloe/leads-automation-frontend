"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarClock,
  Check,
  Circle,
  Clock3,
  Coffee,
  Copy,
  Info,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { systemNotify } from "@/lib/system-notifications";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { AppErrorState } from "@/components/app-error-state";
import { AppFormField } from "@/components/app-form-field";
import { AppSelect } from "@/components/app-select";
import { AppTimePicker } from "@/components/app-time-picker";
import { BusinessSetupTabs } from "@/components/business-setup/business-setup-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useBusinessAvailability,
  useBusinessAvailabilitySummary,
  useUpdateBusinessAvailability,
} from "@/hooks/use-business-availability";
import { useBusinessSetupStatus } from "@/hooks/use-business-setup";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { businessAvailabilitySchema } from "@/schemas/business-availability";
import {
  DAYS_OF_WEEK,
  type AvailabilityFormRule,
  type AvailabilityFormValues,
  type BusinessAvailabilityResponse,
  type DayOfWeek,
  type UpdateBusinessAvailabilityInput,
} from "@/types/business-availability";
import type { BusinessSetupStatus } from "@/types/business-setup";

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday",
  FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};
const TIMEZONES = ["Africa/Accra", "Africa/Lagos", "Africa/Johannesburg", "Africa/Nairobi", "UTC", "Europe/London", "America/New_York"]
  .map((value) => ({ value, label: value }));

function suggestedRules(): AvailabilityFormRule[] {
  return DAYS_OF_WEEK.map((dayOfWeek, index) => ({
    dayOfWeek,
    isOpen: index < 6,
    openTime: index < 5 ? "08:00" : index === 5 ? "09:00" : "",
    closeTime: index < 5 ? "17:00" : index === 5 ? "15:00" : "",
    hasBreak: false,
    breakStartTime: "",
    breakEndTime: "",
    appliesToAllServices: true,
  }));
}

function formValues(availability: BusinessAvailabilityResponse): AvailabilityFormValues {
  const saved = new Map(availability.rules.map((rule) => [rule.dayOfWeek, rule]));
  return {
    timezone: availability.timezone || "Africa/Accra",
    rules: DAYS_OF_WEEK.map((dayOfWeek) => {
      const rule = saved.get(dayOfWeek);
      if (!rule) return suggestedRules().find((item) => item.dayOfWeek === dayOfWeek)!;
      return {
        dayOfWeek,
        isOpen: rule.isOpen,
        openTime: rule.openTime ?? "",
        closeTime: rule.closeTime ?? "",
        hasBreak: Boolean(rule.breakStartTime && rule.breakEndTime),
        breakStartTime: rule.breakStartTime ?? "",
        breakEndTime: rule.breakEndTime ?? "",
        appliesToAllServices: rule.appliesToAllServices,
      };
    }),
  };
}

function payload(values: AvailabilityFormValues): UpdateBusinessAvailabilityInput {
  return {
    timezone: values.timezone,
    rules: values.rules.map((rule) => rule.isOpen ? {
      dayOfWeek: rule.dayOfWeek,
      isOpen: true,
      openTime: rule.openTime,
      closeTime: rule.closeTime,
      breakStartTime: rule.hasBreak ? rule.breakStartTime : null,
      breakEndTime: rule.hasBreak ? rule.breakEndTime : null,
      appliesToAllServices: rule.appliesToAllServices,
    } : {
      dayOfWeek: rule.dayOfWeek,
      isOpen: false,
      appliesToAllServices: rule.appliesToAllServices,
    }),
  };
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(2020, 0, 1, hour, minute));
}

function AvailabilityLoading() {
  return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8"><Skeleton className="h-9 w-52" /><Skeleton className="mt-3 h-4 w-[520px] max-w-full" /><Skeleton className="mt-6 h-28 rounded-xl" /><div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"><Skeleton className="h-[780px] rounded-xl" /><div className="space-y-5"><Skeleton className="h-80 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div></div></main>;
}

function OpenSwitch({ checked, disabled, label, onChange }: { checked: boolean; disabled: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={`${label} is ${checked ? "open" : "closed"}`} disabled={disabled} onClick={() => onChange(!checked)} className={cn("inline-flex min-h-11 items-center rounded-lg px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60", checked ? "text-primary" : "text-muted-foreground")}><span className={cn("relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200", checked ? "border-primary bg-primary" : "border-input bg-muted")}><span className={cn("absolute top-0.5 size-4.5 rounded-full bg-card shadow-sm transition-transform duration-200", checked ? "translate-x-5" : "translate-x-0.5")} /></span><span className="ml-4 min-w-12 text-left text-xs font-bold">{checked ? "Open" : "Closed"}</span></button>;
}

function DayRow({ index, form, disabled }: { index: number; form: ReturnType<typeof useForm<AvailabilityFormValues>>; disabled: boolean }) {
  const rule = useWatch({ control: form.control, name: `rules.${index}` });
  const errors = form.formState.errors.rules?.[index];
  const setOpen = (checked: boolean) => {
    form.setValue(`rules.${index}.isOpen`, checked, { shouldDirty: true, shouldValidate: true });
    if (!checked) {
      for (const field of ["openTime", "closeTime", "breakStartTime", "breakEndTime"] as const) {
        form.setValue(`rules.${index}.${field}`, "", { shouldDirty: true, shouldValidate: true });
      }
      form.setValue(`rules.${index}.hasBreak`, false, { shouldDirty: true, shouldValidate: true });
    }
  };
  const setBreak = (checked: boolean) => {
    form.setValue(`rules.${index}.hasBreak`, checked, { shouldDirty: true, shouldValidate: true });
    if (!checked) {
      form.setValue(`rules.${index}.breakStartTime`, "", { shouldDirty: true, shouldValidate: true });
      form.setValue(`rules.${index}.breakEndTime`, "", { shouldDirty: true, shouldValidate: true });
    }
  };
  return <article className={cn("rounded-xl border p-4 transition-colors duration-200 sm:p-5", rule.isOpen ? "bg-card" : "bg-muted/30")}>
    <div className="grid gap-4 lg:grid-cols-[130px_112px_minmax(260px,1fr)] lg:items-start">
      <div className="flex items-center justify-between gap-3 lg:block"><div><h3 className="text-sm font-bold">{DAY_LABELS[rule.dayOfWeek]}</h3><p className="mt-1 text-xs text-muted-foreground">{rule.isOpen ? "Customers can reach you" : "Not available"}</p></div><div className="lg:hidden"><OpenSwitch checked={rule.isOpen} disabled={disabled} label={DAY_LABELS[rule.dayOfWeek]} onChange={setOpen} /></div></div>
      <div className="hidden lg:block"><OpenSwitch checked={rule.isOpen} disabled={disabled} label={DAY_LABELS[rule.dayOfWeek]} onChange={setOpen} /></div>
      {rule.isOpen ? <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)_auto] sm:items-start">
          <Controller control={form.control} name={`rules.${index}.openTime`} render={({ field }) => <AppFormField id={`open-${index}`} label="Opens" error={errors?.openTime?.message}><AppTimePicker id={`open-${index}`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} disabled={disabled} error={Boolean(errors?.openTime)} /></AppFormField>} />
          <span className="hidden pt-10 text-center text-muted-foreground sm:block">–</span>
          <Controller control={form.control} name={`rules.${index}.closeTime`} render={({ field }) => <AppFormField id={`close-${index}`} label="Closes" error={errors?.closeTime?.message}><AppTimePicker id={`close-${index}`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} disabled={disabled} error={Boolean(errors?.closeTime)} /></AppFormField>} />
          <button type="button" disabled={disabled} onClick={() => setBreak(!rule.hasBreak)} aria-expanded={rule.hasBreak} className={cn("mt-6 min-h-11 rounded-lg border px-3 text-xs font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", rule.hasBreak && "border-primary/30 bg-secondary text-primary")}><Coffee className="mr-1.5 inline size-3.5" />{rule.hasBreak ? "Remove break" : "Add break"}</button>
        </div>
        {rule.hasBreak && <div className="grid gap-3 rounded-lg bg-muted/45 p-3 sm:grid-cols-2"><Controller control={form.control} name={`rules.${index}.breakStartTime`} render={({ field }) => <AppFormField id={`break-start-${index}`} label="Break starts" error={errors?.breakStartTime?.message}><AppTimePicker id={`break-start-${index}`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} disabled={disabled} error={Boolean(errors?.breakStartTime)} /></AppFormField>} /><Controller control={form.control} name={`rules.${index}.breakEndTime`} render={({ field }) => <AppFormField id={`break-end-${index}`} label="Break ends" error={errors?.breakEndTime?.message}><AppTimePicker id={`break-end-${index}`} value={field.value} onChange={field.onChange} onBlur={field.onBlur} disabled={disabled} error={Boolean(errors?.breakEndTime)} /></AppFormField>} /></div>}
      </div> : <div className="flex min-h-11 items-center rounded-lg border border-dashed px-3 text-xs text-muted-foreground">No opening hours for this day.</div>}
    </div>
  </article>;
}

function ProgressCard({ values, setup }: { values: AvailabilityFormValues; setup?: BusinessSetupStatus }) {
  const openDays = values.rules.filter((rule) => rule.isOpen).length;
  const complete = values.rules.length === 7 && openDays > 0 && values.rules.every((rule) => !rule.isOpen || Boolean(rule.openTime && rule.closeTime && rule.openTime < rule.closeTime));
  return <AppCard className="mt-6 shadow-none"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Sparkles className="size-5" /></span><div><h2 className="font-bold">{complete ? "Availability setup" : "Availability incomplete"}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{complete ? `Your business is open ${openDays} ${openDays === 1 ? "day" : "days"} a week. BizReply can use this to answer opening-hour questions.` : "Add your weekly business hours so BizReply can answer when customers ask if you are open."}</p></div></div><div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-lg bg-secondary px-3 py-2 text-primary">{complete ? "Schedule ready" : "Needs attention"}</span>{setup && <span className="rounded-lg bg-muted px-3 py-2">Overall setup: {setup.completionPercentage}%</span>}</div></div></AppCard>;
}

function SummaryCard({ values, today, nextOpenDay }: { values: AvailabilityFormValues; today?: { dayOfWeek: DayOfWeek; isOpen: boolean; closeTime?: string | null }; nextOpenDay?: DayOfWeek | null }) {
  const openDays = values.rules.filter((rule) => rule.isOpen).length;
  const breakTimes = values.rules.some((rule) => rule.hasBreak);
  const rows = [
    ["Open days", String(openDays)],
    ["Closed days", String(7 - openDays)],
    ["Timezone", values.timezone],
    ["Today", today?.isOpen ? `Open${today.closeTime ? ` until ${formatTime(today.closeTime)}` : ""}` : "Closed"],
    ["Next open day", nextOpenDay ? DAY_LABELS[nextOpenDay] : "Not set"],
    ["Break times", breakTimes ? "Configured" : "Not configured"],
  ];
  return <AppCard className="shadow-none"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><CalendarClock className="size-5" /></span><div><h2 className="font-bold">Availability summary</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">A quick view of this business&apos;s weekly schedule.</p></div></div><dl className="mt-5 divide-y">{rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="max-w-[170px] text-right text-sm font-bold">{value}</dd></div>)}</dl></AppCard>;
}

function SetupChecklist({ setup }: { setup?: BusinessSetupStatus }) {
  const completed = new Set(setup?.completedItems.map((item) => item.key));
  const availabilityComplete = completed.has("business-availability") || completed.has("businessHours");
  const items = [
    { label: "Business profile", description: "Add your core business details", href: "/settings/business/profile", done: ["businessBasicInfo", "industryDescription", "location"].every((key) => completed.has(key)) },
    { label: "Services & Pricing", description: "Define what your business offers", href: "/settings/business/services", done: completed.has("services") && completed.has("servicePricing") },
    { label: "Availability", description: "Set your weekly business hours", href: "/settings/business/availability", done: availabilityComplete },
    { label: "Policies", description: "Add customer-facing policies", href: "/settings/business/policies", done: completed.has("business-policies") || completed.has("policies") },
  ];
  return <AppCard className="shadow-none"><h2 className="font-bold">Complete your setup</h2><div className="mt-5 space-y-4">{items.map((item) => <Link key={item.label} href={item.href} className="flex gap-3 rounded-lg outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"><span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border", item.done ? "border-primary bg-primary text-primary-foreground" : "border-input")} >{item.done ? <Check className="size-3" /> : <Circle className="size-2 fill-current text-muted-foreground" />}</span><span><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.description}</span></span></Link>)}</div></AppCard>;
}

export function AvailabilityPage() {
  const auth = useCurrentUser();
  const businessId = auth.data?.activeBusiness?.id;
  const availability = useBusinessAvailability(businessId);
  const savedSummary = useBusinessAvailabilitySummary(businessId);
  const setup = useBusinessSetupStatus(businessId);
  const update = useUpdateBusinessAvailability(businessId);
  const canEdit = auth.data?.membership?.role === "BUSINESS_OWNER" || auth.data?.membership?.role === "MANAGER";
  const form = useForm<AvailabilityFormValues>({ resolver: zodResolver(businessAvailabilitySchema), defaultValues: { timezone: "Africa/Accra", rules: suggestedRules() } });
  const values = useWatch({ control: form.control }) as AvailabilityFormValues;

  useEffect(() => {
    if (availability.data) form.reset(formValues(availability.data));
  }, [availability.data, form]);

  const timezoneOptions = useMemo(() => {
    const current = values.timezone;
    return [...new Set([current, ...TIMEZONES.map((option) => option.value)].filter(Boolean))].map((value) => ({ value, label: value }));
  }, [values.timezone]);

  if (auth.isPending || availability.isPending) return <AvailabilityLoading />;
  if (!businessId) return <main className="p-6"><AppErrorState title="No active business" description="Select a business to manage its availability." /></main>;
  if (availability.isError || !availability.data) return <main className="p-6"><AppErrorState title="Could not load availability" description={getApiErrorMessage(availability.error)} onRetry={() => void availability.refetch()} /></main>;

  const replaceRules = (next: AvailabilityFormRule[]) => form.setValue("rules", next, { shouldDirty: true, shouldValidate: true });
  const copyMonday = (allDays: boolean) => {
    const monday = values.rules[0];
    replaceRules(values.rules.map((rule, index) => allDays || index < 5 ? { ...monday, dayOfWeek: rule.dayOfWeek } : rule));
  };
  const closeDays = (days: DayOfWeek[]) => replaceRules(values.rules.map((rule) => days.includes(rule.dayOfWeek) ? { ...rule, isOpen: false, openTime: "", closeTime: "", hasBreak: false, breakStartTime: "", breakEndTime: "" } : rule));
  const submit = form.handleSubmit(async (nextValues) => {
    try {
      const saved = await update.mutateAsync(payload(nextValues));
      form.reset(formValues(saved));
      systemNotify.success(saved.summary.isComplete ? "Availability saved" : "Availability saved. Some days still need complete hours.");
    } catch (error) {
      applyApiFieldErrors(error, form.setError);
      const message = error instanceof ApiError && error.code === "FORBIDDEN"
        ? "You do not have permission to manage business availability."
        : error instanceof ApiError && error.code === "INVALID_TIMEZONE"
          ? "Please select a valid timezone."
          : error instanceof ApiError && error.code === "INVALID_TIME_RANGE"
            ? "Please check your opening, closing, and break times."
            : getApiErrorMessage(error);
      systemNotify.error("Could not save availability", { description: message });
    }
  });

  return <form onSubmit={submit} noValidate className="pb-24">
    <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
      <header><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Availability</h1><p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">Set your business hours so BizReply can answer when customers ask if you are open.</p></header>
      <BusinessSetupTabs activeKey="availability" className="mt-5" />
      <ProgressCard values={values} setup={setup.data} />
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <AppCard className="shadow-none"><div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5"><div><div className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /><h2 className="font-bold">Weekly business hours</h2></div><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">These hours help BizReply answer customer questions about when your business is open.</p></div>{!canEdit && <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"><ShieldCheck className="size-3.5" />Read only</span>}</div>
          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><Controller control={form.control} name="timezone" render={({ field }) => <AppFormField id="availability-timezone" label="Timezone" required error={form.formState.errors.timezone?.message} hint="Opening hours are interpreted using this timezone."><AppSelect id="availability-timezone" value={field.value} onValueChange={field.onChange} disabled={!canEdit} options={timezoneOptions} /></AppFormField>} />{canEdit && <div className="flex flex-wrap gap-2"><AppButton type="button" size="sm" variant="outline" onClick={() => copyMonday(false)}><Copy className="size-3.5" />Apply to weekdays</AppButton><AppButton type="button" size="sm" variant="outline" onClick={() => copyMonday(true)}><Copy className="size-3.5" />Apply to all days</AppButton><AppButton type="button" size="sm" variant="outline" onClick={() => closeDays(["SATURDAY", "SUNDAY"])}>Close weekends</AppButton></div>}</div>
          {!availability.data.rules.length && <div className="mt-5 flex gap-3 rounded-xl border border-dashed bg-secondary/40 p-4"><Sun className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-sm font-semibold">Start with suggested hours</p><p className="mt-1 text-xs leading-5 text-muted-foreground">We prepared a Monday–Saturday draft. Nothing is saved until you select Save availability.</p></div></div>}
          <div className="mt-5 grid gap-3">{values.rules.map((rule, index) => <DayRow key={rule.dayOfWeek} index={index} form={form} disabled={!canEdit} />)}</div>
          {canEdit && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-5"><p className="flex items-center gap-2 text-xs text-muted-foreground"><Info className="size-3.5" />Closed days send no time values to the backend.</p><AppButton type="button" size="sm" variant="ghost" onClick={() => closeDays([...DAYS_OF_WEEK])}><RotateCcw className="size-3.5" />Clear all hours</AppButton></div>}
        </AppCard>
        <aside className="space-y-5 xl:sticky xl:top-20"><SummaryCard values={values} today={savedSummary.data?.todayStatus} nextOpenDay={savedSummary.data?.nextOpenDay} /><SetupChecklist setup={setup.data} /><AppCard className="shadow-none"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Sun className="size-5" /></span><div><h2 className="text-sm font-bold">One schedule per business</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Availability applies to the whole business for now. Service and staff schedules will come later.</p></div></div></AppCard></aside>
      </div>
    </main>
    {canEdit && (form.formState.isDirty || availability.data.rules.length === 0) && <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 py-3 shadow-[0_-8px_24px_rgba(20,35,27,0.06)] backdrop-blur-xl"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3"><p className="hidden text-xs text-muted-foreground sm:block">{availability.data.rules.length === 0 ? "Review and save the suggested weekly schedule." : "You have unsaved availability changes."}</p><div className="ml-auto flex gap-3"><AppButton type="button" variant="outline" disabled={update.isPending} onClick={() => form.reset(formValues(availability.data))}>Reset changes</AppButton><AppButton type="submit" loading={update.isPending} loadingText="Saving availability">Save availability</AppButton></div></div></div>}
  </form>;
}
