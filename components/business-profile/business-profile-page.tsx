"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Check,
  Circle,
  CloudUpload,
  Info,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { AppErrorState } from "@/components/app-error-state";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AppSelect, type AppSelectOption } from "@/components/app-select";
import { BusinessReadinessBadge } from "@/components/business-setup/business-readiness-badge";
import { BusinessSetupTabs } from "@/components/business-setup/business-setup-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessProfile, useUpdateBusinessProfile } from "@/hooks/use-business-profile";
import { useBusinessSetupStatus } from "@/hooks/use-business-setup";
import { useCurrentUser } from "@/hooks/use-auth";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { resolveSetupRoute } from "@/lib/business-setup";
import { businessProfileSchema, type BusinessProfileValues } from "@/schemas/business-profile";
import { BUSINESS_INDUSTRIES, type BusinessProfile, type UpdateBusinessProfileInput } from "@/types/business-profile";
import type { BusinessSetupStatus } from "@/types/business-setup";

const INDUSTRY_LABELS: Record<(typeof BUSINESS_INDUSTRIES)[number], string> = {
  REAL_ESTATE: "Real Estate",
  CONSTRUCTION: "Construction",
  ARCHITECTURE: "Architecture",
  CONSULTING: "Consulting",
  SALON_BEAUTY: "Salon & Beauty",
  CLINIC_HEALTHCARE: "Clinic & Healthcare",
  HOTEL_HOSPITALITY: "Hotel & Hospitality",
  ONLINE_STORE: "Online Store",
  EDUCATION: "Education",
  LEGAL: "Legal",
  FINANCE: "Finance",
  OTHER: "Other",
};

const COUNTRY_OPTIONS = ["Ghana", "Nigeria", "South Africa", "Kenya", "United Kingdom", "United States"];
const TIMEZONE_OPTIONS = ["Africa/Accra", "Africa/Lagos", "Africa/Johannesburg", "Africa/Nairobi", "Europe/London", "America/New_York"];
const CURRENCY_OPTIONS = ["GHS", "NGN", "ZAR", "KES", "GBP", "USD", "EUR"];
const MANAGER_FIELDS = new Set<keyof BusinessProfileValues>([
  "description", "address", "serviceArea", "phone", "email", "website", "defaultNotificationEmail",
]);

function options(values: string[], current: string, labels?: Record<string, string>): AppSelectOption[] {
  return [...new Set([current, ...values].filter(Boolean))].map((value) => ({ value, label: labels?.[value] ?? value }));
}

function profileValues(profile: BusinessProfile): BusinessProfileValues {
  return {
    name: profile.name,
    industry: profile.industry,
    description: profile.description ?? "",
    country: profile.country ?? "",
    city: profile.city ?? "",
    address: profile.address ?? "",
    serviceArea: profile.serviceArea ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    website: profile.website ?? "",
    timezone: profile.timezone,
    defaultCurrency: profile.defaultCurrency,
    defaultNotificationEmail: profile.defaultNotificationEmail ?? "",
  };
}

function updatePayload(values: BusinessProfileValues, dirtyFields: Partial<Record<keyof BusinessProfileValues, unknown>>): UpdateBusinessProfileInput {
  const nullable = new Set<keyof BusinessProfileValues>(["description", "address", "serviceArea", "phone", "email", "website", "defaultNotificationEmail"]);
  return Object.fromEntries(Object.keys(dirtyFields).map((key) => {
    const field = key as keyof BusinessProfileValues;
    const value = values[field];
    return [field, nullable.has(field) && value === "" ? null : value];
  })) as UpdateBusinessProfileInput;
}

function ProfileLoading() {
  return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8"><Skeleton className="h-9 w-56" /><Skeleton className="mt-3 h-4 w-96 max-w-full" /><Skeleton className="mt-6 h-28 w-full rounded-xl" /><div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"><Skeleton className="h-[780px] rounded-xl" /><div className="space-y-5"><Skeleton className="h-96 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div></div></main>;
}

function SetupProgress({ status }: { status: BusinessSetupStatus }) {
  return <AppCard className="mt-6 p-5 shadow-none"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold">Setup progress</h2><p className="mt-1 text-sm text-muted-foreground">Complete the remaining steps to get the most out of BizReply.</p></div><div className="flex items-center gap-3"><strong className="text-sm tabular-nums">{status.completionPercentage}%</strong><BusinessReadinessBadge status={status.readinessStatus} /></div></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Business setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={status.completionPercentage}><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, status.completionPercentage))}%` }} /></div></AppCard>;
}

const CHECKLIST = [
  { key: "profile", label: "Business profile", description: "Add your basic business details", sourceKeys: ["businessBasicInfo", "industryDescription", "location"] },
  { key: "services", label: "Add services", description: "Define the services you offer", sourceKeys: ["services"] },
  { key: "pricing", label: "Set pricing", description: "Configure your service pricing", sourceKeys: ["servicePricing"] },
  { key: "availability", label: "Configure availability", description: "Set your business hours", sourceKeys: ["business-availability"] },
  { key: "policies", label: "Add policies", description: "Add terms, privacy & refund policies", sourceKeys: ["policies"] },
];

function SetupChecklist({ status }: { status: BusinessSetupStatus }) {
  const completed = new Set(status.completedItems.map((item) => item.key));
  const isCompleted = (key: string) => completed.has(key) || (key === "business-availability" && completed.has("businessHours"));
  const missing = new Map(status.missingItems.map((item) => [item.key, item]));
  const remaining = CHECKLIST.filter((item) => !item.sourceKeys.every(isCompleted)).length;
  return <AppCard className="shadow-none"><div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold">Complete your setup</h2><span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">{remaining} {remaining === 1 ? "step" : "steps"} remaining</span></div><ol className="mt-5 space-y-0">{CHECKLIST.map((item, index) => {
    const done = item.sourceKeys.every(isCompleted);
    const missingItem = item.sourceKeys.map((key) => missing.get(key)).find(Boolean);
    const route = resolveSetupRoute(missingItem?.route);
    const content = <><span className={`relative z-10 grid size-6 shrink-0 place-items-center rounded-full border ${done ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground"}`}>{done ? <Check className="size-3.5" /> : <Circle className="size-2 fill-current" />}</span><span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.description}</span></span></>;
    return <li key={item.key} className="relative pb-5 last:pb-0">{index < CHECKLIST.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-px bg-border" />}{route.available && route.href && !done ? <Link href={route.href} className="flex gap-3 rounded-lg outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">{content}</Link> : <div className="flex gap-3">{content}</div>}</li>;
  })}</ol></AppCard>;
}

function Field({ name, label, required, disabled, form, children }: { name: keyof BusinessProfileValues; label: string; required?: boolean; disabled?: boolean; form: UseFormReturn<BusinessProfileValues>; children?: React.ReactNode }) {
  return <AppFormField id={name} label={label} required={required} error={form.formState.errors[name]?.message}>{children ?? <AppInput id={name} disabled={disabled} {...form.register(name)} />}</AppFormField>;
}

export function BusinessProfilePage() {
  const auth = useCurrentUser();
  const businessId = auth.data?.activeBusiness?.id;
  const profile = useBusinessProfile(businessId);
  const setup = useBusinessSetupStatus(businessId);
  const update = useUpdateBusinessProfile(businessId);
  const role = auth.data?.membership?.role;
  const canEdit = role === "BUSINESS_OWNER" || role === "MANAGER";
  const manager = role === "MANAGER";
  const form = useForm<BusinessProfileValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: { name: "", industry: "", description: "", country: "", city: "", address: "", serviceArea: "", phone: "", email: "", website: "", timezone: "", defaultCurrency: "", defaultNotificationEmail: "" },
  });
  const descriptionLength = useWatch({ control: form.control, name: "description" }).length;

  useEffect(() => {
    if (profile.data) form.reset(profileValues(profile.data));
  }, [form, profile.data]);

  const selectOptions = useMemo(() => profile.data ? {
    industries: options(BUSINESS_INDUSTRIES as unknown as string[], profile.data.industry, INDUSTRY_LABELS),
    countries: options(COUNTRY_OPTIONS, profile.data.country ?? ""),
    timezones: options(TIMEZONE_OPTIONS, profile.data.timezone),
    currencies: options(CURRENCY_OPTIONS, profile.data.defaultCurrency),
  } : null, [profile.data]);

  if (profile.isPending || auth.isPending) return <ProfileLoading />;
  if (profile.isError || !profile.data || !selectOptions) return <main className="p-6"><AppErrorState title="Could not load business profile" description={getApiErrorMessage(profile.error)} onRetry={() => void profile.refetch()} /></main>;

  const disabled = (field: keyof BusinessProfileValues) => !canEdit || (manager && !MANAGER_FIELDS.has(field));
  const submit = form.handleSubmit(async (values) => {
    const payload = updatePayload(values, form.formState.dirtyFields);
    if (!Object.keys(payload).length) return;
    try {
      const saved = await update.mutateAsync(payload);
      form.reset(profileValues(saved));
      toast.success("Changes saved", { description: "Your business profile and setup progress are up to date." });
    } catch (error) {
      applyApiFieldErrors(error, form.setError);
      const permission = error instanceof ApiError && error.code === "FORBIDDEN";
      toast.error(permission ? "You do not have permission to update business profile settings." : "Could not save changes", { description: permission ? undefined : getApiErrorMessage(error) });
    }
  });

  return <form onSubmit={submit} noValidate className="pb-24">
    <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
      <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Business profile</h1><p className="mt-1.5 text-sm text-muted-foreground">Set up your business details so BizReply can automate replies accurately.</p></div>
      <BusinessSetupTabs activeKey="business-profile" className="mt-5" />
      {setup.data ? <SetupProgress status={setup.data} /> : <Skeleton className="mt-6 h-28 rounded-xl" />}
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <AppCard className="shadow-none"><h2 className="text-base font-bold">Business information</h2><p className="mt-1 text-xs text-muted-foreground">{canEdit ? "Keep customer-facing details accurate and current." : "You can view this profile, but only an owner or manager can update it."}</p>
          <section className="mt-6 grid gap-6 border-b pb-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <div><p className="text-sm font-semibold">Business logo</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Upload your business logo for future emails, forms, and chat replies.</p><div className="mt-4 flex items-center gap-4"><span className="grid size-20 shrink-0 place-items-center rounded-full bg-secondary text-2xl font-bold text-primary">{profile.data.name.slice(0, 2).toUpperCase()}</span><button type="button" disabled className="flex min-h-20 flex-1 cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 px-4 text-left opacity-75"><CloudUpload className="size-5 text-primary" /><span><span className="block text-sm font-semibold">Logo upload coming soon</span><span className="mt-0.5 block text-xs text-muted-foreground">PNG, JPG, SVG up to 2MB</span></span></button></div></div>
            <div className="grid gap-5"><Field name="name" label="Business name" required disabled={disabled("name")} form={form} /><Controller control={form.control} name="industry" render={({ field }) => <Field name="industry" label="Industry" required form={form}><AppSelect id="industry" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} disabled={disabled("industry")} options={selectOptions.industries} error={Boolean(form.formState.errors.industry)} /></Field>} /></div>
          </section>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field name="description" label="Description" form={form}><textarea id="description" rows={4} disabled={disabled("description")} placeholder="Describe what your business does" className="w-full resize-y rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50" {...form.register("description")} /><p className="mt-1 text-right text-[11px] text-muted-foreground">{descriptionLength} / 1000</p></Field></div>
            <Controller control={form.control} name="country" render={({ field }) => <Field name="country" label="Country" required form={form}><AppSelect id="country" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} disabled={disabled("country")} options={selectOptions.countries} error={Boolean(form.formState.errors.country)} /></Field>} />
            <Field name="city" label="City" required disabled={disabled("city")} form={form} />
            <Field name="address" label="Address" disabled={disabled("address")} form={form} />
            <Field name="serviceArea" label="Service area" disabled={disabled("serviceArea")} form={form} />
            <Field name="phone" label="Phone number" disabled={disabled("phone")} form={form}><AppInput id="phone" type="tel" autoComplete="tel" placeholder="+233 24 000 0000" disabled={disabled("phone")} {...form.register("phone")} /></Field>
            <Field name="email" label="Email address" disabled={disabled("email")} form={form}><AppInput id="email" type="email" autoComplete="email" disabled={disabled("email")} {...form.register("email")} /></Field>
            <Field name="website" label="Website" disabled={disabled("website")} form={form}><AppInput id="website" type="url" placeholder="https://example.com" disabled={disabled("website")} {...form.register("website")} /></Field>
            <Controller control={form.control} name="timezone" render={({ field }) => <Field name="timezone" label="Timezone" required form={form}><AppSelect id="timezone" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} disabled={disabled("timezone")} options={selectOptions.timezones} error={Boolean(form.formState.errors.timezone)} /></Field>} />
            <Controller control={form.control} name="defaultCurrency" render={({ field }) => <Field name="defaultCurrency" label="Default currency" required form={form}><AppSelect id="defaultCurrency" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} disabled={disabled("defaultCurrency")} options={selectOptions.currencies} error={Boolean(form.formState.errors.defaultCurrency)} /></Field>} />
            <Field name="defaultNotificationEmail" label="Default notification email" disabled={disabled("defaultNotificationEmail")} form={form}><AppInput id="defaultNotificationEmail" type="email" disabled={disabled("defaultNotificationEmail")} {...form.register("defaultNotificationEmail")} /></Field>
          </div>
          {manager && <div className="mt-6 flex gap-3 rounded-xl border bg-muted/40 p-4 text-sm"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><p><strong>Manager access:</strong> business identity and regional settings are owner-managed. Operational details remain editable.</p></div>}
        </AppCard>
        <aside className="space-y-5 xl:sticky xl:top-20">{setup.data ? <SetupChecklist status={setup.data} /> : <Skeleton className="h-96 rounded-xl" />}<AppCard className="shadow-none"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><LifeBuoy className="size-5" /></span><div><h2 className="text-sm font-bold">Need help?</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Review your setup progress or contact your workspace owner for help.</p></div></div><div className="mt-4 grid gap-2"><Link href="/dashboard" className="flex min-h-10 items-center justify-between rounded-lg px-2 text-sm font-semibold text-primary hover:bg-secondary">View setup guide <ArrowRight className="size-4" /></Link><span className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs text-muted-foreground"><Info className="size-4" />More settings modules are coming soon.</span></div></AppCard></aside>
      </div>
    </main>
    {canEdit && form.formState.isDirty && <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 py-3 shadow-[0_-8px_24px_rgba(20,35,27,0.06)] backdrop-blur-xl"><div className="mx-auto flex max-w-[1500px] items-center justify-end gap-3"><AppButton type="button" variant="outline" onClick={() => form.reset(profileValues(profile.data))} disabled={update.isPending}>Cancel</AppButton><AppButton type="submit" loading={update.isPending} loadingText="Saving changes">Save changes</AppButton></div></div>}
  </form>;
}
