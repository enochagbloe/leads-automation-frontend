"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Checkbox from "@radix-ui/react-checkbox";
import {
  Archive,
  Banknote,
  CalendarCheck2,
  Check,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { systemNotify } from "@/lib/system-notifications";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { AppEmptyState } from "@/components/app-empty-state";
import { AppErrorState } from "@/components/app-error-state";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { BusinessSetupTabs } from "@/components/business-setup/business-setup-tabs";
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBusinessProfile } from "@/hooks/use-business-profile";
import {
  useArchiveBusinessService,
  useBusinessServices,
  useBusinessServicesSummary,
  useCreateBusinessService,
  useRestoreBusinessService,
  useUpdateBusinessService,
} from "@/hooks/use-business-services";
import { useBusinessSetupStatus } from "@/hooks/use-business-setup";
import { useCurrentSubscription } from "@/hooks/use-subscription";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { businessServiceSchema, type BusinessServiceValues } from "@/schemas/business-service";
import type { BusinessService, BusinessServiceInput, BusinessServicesQuery, ServicePriceType, ServiceReadinessStatus, ServicesSummary } from "@/types/business-service";

const PRICE_TYPES: Array<{ value: ServicePriceType; label: string }> = [
  { value: "FIXED", label: "Fixed price" }, { value: "STARTING_FROM", label: "Starting from" },
  { value: "RANGE", label: "Price range" }, { value: "QUOTE_ONLY", label: "Quote only" },
  { value: "FREE", label: "Free" }, { value: "NOT_SET", label: "Not set yet" },
];
const READINESS: Array<{ value: string; label: string }> = [
  { value: "__all", label: "All readiness" }, { value: "DRAFT", label: "Draft" }, { value: "INCOMPLETE", label: "Incomplete" },
  { value: "READY_FOR_AI", label: "Ready for AI" }, { value: "READY_FOR_BOOKING", label: "Ready for booking" }, { value: "ARCHIVED", label: "Archived" },
];
const STATUS = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "archived", label: "Archived" }, { value: "all", label: "All services" }];
const DURATIONS = [{ value: "__unset", label: "Not set" }, { value: "15", label: "15 min" }, { value: "30", label: "30 min" }, { value: "45", label: "45 min" }, { value: "60", label: "1 hour" }, { value: "90", label: "1 hour 30 min" }, { value: "120", label: "2 hours" }];
const CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN", "KES", "ZAR"].map((value) => ({ value, label: value }));
const DEFAULT_VALUES: BusinessServiceValues = { name: "", category: "", description: "", priceType: "NOT_SET", basePrice: "", currency: "GHS", priceDescription: "", durationMinutes: "", bufferMinutes: "0", requiresPayment: false, paymentRequiredBeforeBooking: false, isBookable: false, isActive: true, autoConfirmEligible: false, requiresManualApproval: false, requiresDepositBeforeConfirmation: false, requiresLocationBeforeConfirmation: false, requiresStaffAssignment: false };

function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(timer); }, [delay, value]);
  return debounced;
}

function priceLabel(service: BusinessService) {
  if (service.priceType === "FREE") return "Free";
  if (service.priceType === "QUOTE_ONLY") return service.priceDescription ? `Quote only · ${service.priceDescription}` : "Quote only";
  if (service.priceType === "RANGE") return service.priceDescription ? `Price range · ${service.priceDescription}` : service.basePrice ? `From ${service.currency} ${service.basePrice}` : "Price range not set";
  if (service.priceType === "STARTING_FROM") return service.basePrice ? `From ${service.currency} ${service.basePrice}` : "Price not set";
  if (service.priceType === "FIXED") return service.basePrice ? `${service.currency} ${service.basePrice}` : "Price not set";
  return "Price not set";
}

function readinessTone(status: ServiceReadinessStatus) {
  if (status === "READY_FOR_BOOKING") return "bg-success/10 text-success";
  if (status === "READY_FOR_AI") return "bg-secondary text-primary";
  if (status === "ARCHIVED") return "bg-muted text-muted-foreground";
  return "bg-warning/10 text-warning";
}

function readinessLabel(status: ServiceReadinessStatus) {
  return { DRAFT: "Draft", INCOMPLETE: "Incomplete", READY_FOR_AI: "Ready for AI", READY_FOR_BOOKING: "Ready for booking", ARCHIVED: "Archived" }[status];
}

function missingLabel(field: string) {
  return { price: "Price missing", durationMinutes: "Duration missing", description: "Description missing", currency: "Currency missing", paymentRequirement: "Payment setup missing" }[field] ?? field;
}

function valuesFromService(service: BusinessService): BusinessServiceValues {
  return { name: service.name, category: service.category ?? "", description: service.description ?? "", priceType: service.priceType, basePrice: service.basePrice ?? "", currency: service.currency, priceDescription: service.priceDescription ?? "", durationMinutes: service.durationMinutes ? String(service.durationMinutes) : "", bufferMinutes: String(service.bufferMinutes), requiresPayment: service.requiresPayment, paymentRequiredBeforeBooking: service.paymentRequiredBeforeBooking, isBookable: service.isBookable, isActive: service.isActive, autoConfirmEligible: service.autoConfirmEligible ?? false, requiresManualApproval: service.requiresManualApproval ?? false, requiresDepositBeforeConfirmation: service.requiresDepositBeforeConfirmation ?? false, requiresLocationBeforeConfirmation: service.requiresLocationBeforeConfirmation ?? false, requiresStaffAssignment: service.requiresStaffAssignment ?? false };
}

function toInput(values: BusinessServiceValues): BusinessServiceInput {
  const usesBasePrice = ["FIXED", "STARTING_FROM", "RANGE"].includes(values.priceType);
  const usesPriceDescription = ["QUOTE_ONLY", "RANGE", "NOT_SET"].includes(values.priceType);
  return { name: values.name.trim(), category: values.category.trim() || null, description: values.description.trim() || null, priceType: values.priceType, basePrice: usesBasePrice ? values.basePrice || null : null, currency: values.currency.toUpperCase(), priceDescription: usesPriceDescription ? values.priceDescription.trim() || null : null, durationMinutes: values.durationMinutes && values.durationMinutes !== "__unset" ? Number(values.durationMinutes) : null, bufferMinutes: Number(values.bufferMinutes), requiresPayment: values.requiresPayment, paymentRequiredBeforeBooking: values.paymentRequiredBeforeBooking, isBookable: values.isBookable, isActive: values.isActive, autoConfirmEligible: values.autoConfirmEligible, requiresManualApproval: values.requiresManualApproval, requiresDepositBeforeConfirmation: values.requiresDepositBeforeConfirmation, requiresLocationBeforeConfirmation: values.requiresLocationBeforeConfirmation, requiresStaffAssignment: values.requiresStaffAssignment };
}

function CheckField({ checked, onChange, label, description }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description: string }) {
  return <label className="flex cursor-pointer gap-3 rounded-xl border bg-card p-3.5"><Checkbox.Root checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5 grid size-5 shrink-0 place-items-center rounded border border-input bg-card text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"><Checkbox.Indicator><Check className="size-3.5" strokeWidth={3} /></Checkbox.Indicator></Checkbox.Root><span><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span></span></label>;
}

function ServiceEditor({ open, onOpenChange, onSaved, service, businessId, defaultCurrency }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: (service: BusinessService) => void; service: BusinessService | null; businessId: string; defaultCurrency: string }) {
  const create = useCreateBusinessService(businessId);
  const update = useUpdateBusinessService(businessId);
  const form = useForm<BusinessServiceValues>({ resolver: zodResolver(businessServiceSchema), defaultValues: DEFAULT_VALUES });
  const priceType = useWatch({ control: form.control, name: "priceType" });
  const requiresPayment = useWatch({ control: form.control, name: "requiresPayment" });
  const autoConfirmEligible = useWatch({ control: form.control, name: "autoConfirmEligible" });
  const requiresManualApproval = useWatch({ control: form.control, name: "requiresManualApproval" });
  const durationMinutes = useWatch({ control: form.control, name: "durationMinutes" });
  const description = useWatch({ control: form.control, name: "description" });
  const basePrice = useWatch({ control: form.control, name: "basePrice" });
  const priceDescription = useWatch({ control: form.control, name: "priceDescription" });

  useEffect(() => {
    if (!open) return;
    const values = service ? valuesFromService(service) : { ...DEFAULT_VALUES, currency: defaultCurrency || "GHS" };
    form.reset({ ...values, durationMinutes: values.durationMinutes || "__unset" });
  }, [defaultCurrency, form, open, service]);

  const submit = form.handleSubmit(async (values) => {
    try {
      const saved = service ? await update.mutateAsync({ id: service.id, input: toInput(values) }) : await create.mutateAsync(toInput(values));
      systemNotify.success(saved.readinessStatus === "DRAFT" || saved.readinessStatus === "INCOMPLETE" ? "Service saved. Some details are still missing." : saved.readinessStatus === "READY_FOR_BOOKING" ? "Service saved. This service is ready for booking." : "Service saved. This service is ready for AI replies.");
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      applyApiFieldErrors(error, form.setError);
      if (error instanceof ApiError && error.code === "SERVICE_NAME_ALREADY_EXISTS") form.setError("name", { message: "A service with this name already exists." });
      systemNotify.error(error instanceof ApiError && error.code === "FORBIDDEN" ? "You do not have permission to manage services." : "Could not save service", { description: getApiErrorMessage(error) });
    }
  });

  const busy = create.isPending || update.isPending;
  const autoConfirmWarnings = [
    ...(autoConfirmEligible && (!durationMinutes || durationMinutes === "__unset") ? ["This service has no duration. Add a duration so AI can check appointment conflicts."] : []),
    ...(autoConfirmEligible && !description?.trim() ? ["This service has no clear description. Add what is included so AI can answer customers accurately."] : []),
    ...(autoConfirmEligible && priceType !== "FREE" && !basePrice && !priceDescription?.trim() ? ["This service has no price. Auto-confirmation may be unsafe for price-sensitive requests."] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="inset-y-0 right-0 flex h-dvh w-full max-w-xl flex-col overflow-hidden border bg-background shadow-2xl sm:right-3 sm:top-3 sm:h-[calc(100dvh-1.5rem)] sm:rounded-2xl">
          <div className="flex items-start justify-between gap-4 border-b bg-card px-5 py-4">
            <div>
              <DialogTitle className="text-lg font-bold">{service ? "Edit service" : "Add service"}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">Add what you know now. Missing details can be completed later.</DialogDescription>
            </div>
            <button type="button" onClick={() => onOpenChange(false)} className="grid size-10 place-items-center rounded-lg hover:bg-muted" aria-label="Close service editor"><X className="size-4" /></button>
          </div>
          <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AppFormField id="service-name" label="Service name" required error={form.formState.errors.name?.message}>
                  <AppInput id="service-name" placeholder="e.g. Property Viewing" {...form.register("name")} />
                </AppFormField>
              </div>
              <AppFormField id="service-category" label="Category" error={form.formState.errors.category?.message}>
                <AppInput id="service-category" placeholder="e.g. Real Estate" {...form.register("category")} />
              </AppFormField>
              <Controller name="priceType" control={form.control} render={({ field }) => (
                <AppFormField id="priceType" label="Price type" error={form.formState.errors.priceType?.message}>
                  <AppSelect id="priceType" value={field.value} onValueChange={field.onChange} options={PRICE_TYPES} />
                </AppFormField>
              )} />
              <div className="sm:col-span-2">
                <AppFormField id="service-description" label="Description" hint="A clear description helps BizReply answer customer questions accurately." error={form.formState.errors.description?.message}>
                  <textarea id="service-description" rows={4} className="w-full resize-y rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20" placeholder="Describe what this service includes." {...form.register("description")} />
                </AppFormField>
              </div>
              {["FIXED", "STARTING_FROM", "RANGE"].includes(priceType) && (
                <AppFormField id="basePrice" label="Base price" error={form.formState.errors.basePrice?.message}>
                  <AppInput id="basePrice" inputMode="decimal" placeholder="100.00" {...form.register("basePrice")} />
                </AppFormField>
              )}
              <Controller name="currency" control={form.control} render={({ field }) => (
                <AppFormField id="currency" label="Currency" error={form.formState.errors.currency?.message}>
                  <AppSelect id="currency" value={field.value} onValueChange={field.onChange} options={CURRENCIES} />
                </AppFormField>
              )} />
              {["QUOTE_ONLY", "RANGE", "NOT_SET"].includes(priceType) && (
                <div className="sm:col-span-2">
                  <AppFormField id="priceDescription" label="Price description" error={form.formState.errors.priceDescription?.message}>
                    <AppInput id="priceDescription" placeholder="Price depends on location, scope, or customer request." {...form.register("priceDescription")} />
                  </AppFormField>
                </div>
              )}
              <Controller name="durationMinutes" control={form.control} render={({ field }) => (
                <AppFormField id="durationMinutes" label="Duration">
                  <AppSelect id="durationMinutes" value={field.value} onValueChange={field.onChange} options={DURATIONS} placeholder="Not set" />
                </AppFormField>
              )} />
              <AppFormField id="bufferMinutes" label="Buffer time (minutes)" error={form.formState.errors.bufferMinutes?.message}>
                <AppInput id="bufferMinutes" inputMode="numeric" {...form.register("bufferMinutes")} />
              </AppFormField>
            </div>

            <div className="mt-6 grid gap-3">
              <Controller name="requiresPayment" control={form.control} render={({ field }) => <CheckField checked={field.value} onChange={(checked) => { field.onChange(checked); if (!checked) form.setValue("paymentRequiredBeforeBooking", false); }} label="Requires payment" description="This service has a payment requirement." />} />
              <Controller name="paymentRequiredBeforeBooking" control={form.control} render={({ field }) => <CheckField checked={field.value} onChange={(checked) => { field.onChange(checked); if (checked && !requiresPayment) form.setValue("requiresPayment", true); }} label="Payment required before booking" description="Customers must pay before a booking is confirmed." />} />
              <Controller name="isBookable" control={form.control} render={({ field }) => <CheckField checked={field.value} onChange={field.onChange} label="Bookable service" description="Customers can book this service as an appointment." />} />
              <Controller name="isActive" control={form.control} render={({ field }) => <CheckField checked={field.value} onChange={field.onChange} label="Active service" description="Inactive services stay saved but are hidden from normal flows." />} />
            </div>

            <section className="mt-6 rounded-2xl border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Sparkles className="size-4" /></span>
                <div>
                  <h3 className="text-sm font-bold">AI Auto-Confirmation</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Use these rules to tell BizReply when this service is safe for Premium AI auto-confirmation.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <Controller name="autoConfirmEligible" control={form.control} render={({ field }) => <CheckField checked={field.value} onChange={field.onChange} label="Allow AI to auto-confirm this service" description="Only enable this for simple, predictable services with clear pricing, duration, and availability." />} />
                <Controller name="requiresManualApproval" control={form.control} render={({ field }) => <CheckField checked={field.value} onChange={field.onChange} label="Always require manual approval" description="Use this for custom, high-value, sensitive, or unclear services." />} />
                <Controller name="requiresDepositBeforeConfirmation" control={form.control} render={({ field }) => <CheckField checked={field.value} onChange={field.onChange} label="Requires deposit/payment before confirmation" description="If enabled, AI will not auto-confirm until payment verification exists. In V1, this should usually keep the appointment pending." />} />
                <Controller name="requiresLocationBeforeConfirmation" control={form.control} render={({ field }) => <CheckField checked={field.value} onChange={field.onChange} label="Requires customer location before confirmation" description="Useful for site visits, inspections, delivery, home service, or field work." />} />
                <Controller name="requiresStaffAssignment" control={form.control} render={({ field }) => <CheckField checked={field.value} onChange={field.onChange} label="Requires staff assignment before confirmation" description="AI can only auto-confirm if an eligible active staff member is assigned and available." />} />
              </div>
              {requiresManualApproval && <p className="mt-4 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold leading-5 text-warning">Manual approval is on, so AI auto-confirmation will be blocked for this service.</p>}
              {autoConfirmWarnings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {autoConfirmWarnings.map((warning) => <p key={warning} className="rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold leading-5 text-warning">{warning}</p>)}
                </div>
              )}
              <div className="mt-4 grid gap-3 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
                <p><span className="font-bold text-foreground">Good for auto-confirm:</span> consultation calls, basic haircuts, standard inspections, and simple fixed-duration appointments.</p>
                <p><span className="font-bold text-foreground">Require manual approval:</span> custom construction, wedding packages, urgent repairs, discount negotiation, high-value quotes, or unclear requests.</p>
              </div>
            </section>

            <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t bg-background py-4">
              <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</AppButton>
              <AppButton type="submit" loading={busy} loadingText="Saving service">{service ? "Save changes" : "Add service"}</AppButton>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

function SummaryCard({ summary }: { summary: ServicesSummary }) {
  const rows = [["Total services", summary.total], ["Active", summary.active], ["Incomplete", summary.incomplete + summary.draft], ["Ready for AI", summary.readyForAi], ["Ready for booking", summary.readyForBooking], ["Missing prices", summary.missingPrices], ["Missing durations", summary.missingDurations]] as const;
  return <AppCard className="shadow-none"><h2 className="font-bold">Services summary</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">A quick view of service readiness for this business.</p><dl className="mt-5 divide-y">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm font-bold tabular-nums">{value}</dd></div>)}</dl></AppCard>;
}

function ServiceCard({ service, canManage, onEdit, onArchive, onRestore, busy }: { service: BusinessService; canManage: boolean; onEdit: () => void; onArchive: () => void; onRestore: () => void; busy: boolean }) {
  return <article className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold">{service.name}</h3><span className={cn("rounded-full px-2 py-1 text-[10px] font-bold", readinessTone(service.readinessStatus))}>{readinessLabel(service.readinessStatus)}</span>{service.isBookable && <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-primary">Bookable</span>}</div><p className="mt-1 text-xs font-medium text-primary">{service.category || "Uncategorized"}</p></div>{canManage && <div className="flex shrink-0 gap-1">{!service.isArchived && <AppButton size="icon" variant="ghost" className="size-9 min-h-9" aria-label={`Edit ${service.name}`} onClick={onEdit}><Pencil className="size-4" /></AppButton>}{service.isArchived ? <AppButton size="sm" variant="outline" loading={busy} onClick={onRestore}><RotateCcw className="size-3.5" />Restore</AppButton> : <ConfirmDialog trigger={<AppButton size="icon" variant="ghost" className="size-9 min-h-9" aria-label={`Archive ${service.name}`}><Archive className="size-4" /></AppButton>} title="Archive service?" description="This service will no longer appear in active service lists, but historical conversations and records will keep their references." confirmLabel="Archive service" loading={busy} onConfirm={onArchive} />}</div>}</div><p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{service.description || "No description added yet."}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-xs font-semibold"><span className="flex items-center gap-1.5"><Banknote className="size-3.5 text-primary" />{priceLabel(service)}</span><span className="flex items-center gap-1.5"><Clock3 className="size-3.5 text-primary" />{service.durationMinutes ? `${service.durationMinutes} min` : "Duration not set"}</span><span className={service.isActive ? "text-success" : "text-muted-foreground"}>{service.isArchived ? "Archived" : service.isActive ? "Active" : "Inactive"}</span></div>{service.missingFields.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{service.missingFields.map((field) => <span key={field} className="rounded-md bg-warning/10 px-2 py-1 text-[10px] font-semibold text-warning">{missingLabel(field)}</span>)}</div>}</article>;
}

export function ServicesPricingPage() {
  const auth = useCurrentUser();
  const businessId = auth.data?.activeBusiness?.id;
  const canManage = auth.data?.membership?.role !== "STAFF";
  const subscription = useCurrentSubscription();
  const profile = useBusinessProfile(businessId);
  const setup = useBusinessSetupStatus(businessId);
  const summary = useBusinessServicesSummary(businessId);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState<BusinessServicesQuery["status"]>("active");
  const [readiness, setReadiness] = useState<string>("__all");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessService | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const query = useMemo<BusinessServicesQuery>(() => ({ status, readinessStatus: readiness === "__all" ? undefined : readiness as ServiceReadinessStatus, search: debouncedSearch || undefined, page, limit: 20, sort: "displayOrder", sortOrder: "asc" }), [debouncedSearch, page, readiness, status]);
  const services = useBusinessServices(businessId, query);
  const archive = useArchiveBusinessService(businessId);
  const restore = useRestoreBusinessService(businessId);
  const openEditor = (service: BusinessService | null) => { setEditing(service); setEditorOpen(true); };
  const showSavedService = (service: BusinessService) => {
    setSearch("");
    setReadiness("__all");
    setPage(1);
    setStatus(service.isArchived ? "archived" : service.isActive ? "active" : "inactive");
  };
  const mutationError = (error: unknown) => {
    if (error instanceof ApiError && error.code === "SERVICE_LIMIT_REACHED") setLimitMessage(error.message);
    systemNotify.error(error instanceof ApiError && error.code === "FORBIDDEN" ? "You do not have permission to manage services." : "Could not update service", { description: getApiErrorMessage(error) });
  };
  if (auth.isPending) return <main className="p-6"><Skeleton className="h-[700px] rounded-xl" /></main>;
  if (!businessId) return <main className="p-6"><AppErrorState title="No active business" description="Select a business to manage its services." /></main>;
  const activeLimit = subscription.data?.plan.limits.services;
  const limitReached = activeLimit !== null && activeLimit !== undefined && (summary.data?.active ?? 0) >= activeLimit;
  const recommendedPlan = subscription.data?.plan.code === "BASIC" ? "PLUS" : subscription.data?.plan.code === "PLUS" ? "PREMIUM" : undefined;
  return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Services & Pricing</h1><p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">Add the services your business offers and define their base prices, duration, and booking rules.</p></div>{canManage && <AppButton onClick={() => openEditor(null)} disabled={limitReached}><Plus className="size-4" />Add service</AppButton>}</header><BusinessSetupTabs activeKey="services-pricing" className="mt-5" />{(limitMessage || limitReached) && <UpgradePrompt message={limitMessage ?? `You have reached the ${subscription.data?.plan.name ?? "current"} plan active service limit. Archive an existing service or upgrade your plan.`} recommendedPlan={recommendedPlan} className="mt-6" />}
    <AppCard className="mt-6 shadow-none"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><h2 className="font-bold">Services setup</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">You have {summary.data?.total ?? 0} services added. {summary.data?.readyForAi ?? 0} ready for AI replies and {summary.data?.readyForBooking ?? 0} ready for bookings.</p><p className="mt-1 text-xs text-muted-foreground">You can continue using BizReply while completing service details over time.</p></div><div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-lg bg-muted px-3 py-2">Missing prices: {summary.data?.missingPrices ?? 0}</span><span className="rounded-lg bg-muted px-3 py-2">Missing durations: {summary.data?.missingDurations ?? 0}</span><span className="rounded-lg bg-secondary px-3 py-2 text-primary">Setup: {setup.data?.completionPercentage ?? 0}%</span></div></div></AppCard>
    <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"><section><div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><AppInput value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search services" className="pl-9" /></div><div className="grid grid-cols-2 gap-2 sm:flex">{canManage && <AppSelect value={status} onValueChange={(value) => { setStatus(value as BusinessServicesQuery["status"]); setPage(1); }} options={STATUS} className="sm:w-36" />}<AppSelect value={readiness} onValueChange={(value) => { setReadiness(value); setPage(1); }} options={READINESS} className="sm:w-44" /><AppButton size="icon" variant="outline" onClick={() => void Promise.all([services.refetch(), summary.refetch()])} aria-label="Refresh services"><RefreshCw className={cn("size-4", services.isFetching && "animate-spin")} /></AppButton></div></div>
      {services.isPending ? <div className="mt-4 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-56 rounded-xl" />)}</div> : services.isError ? <AppErrorState className="mt-4" title="Could not load services" description={getApiErrorMessage(services.error)} onRetry={() => void services.refetch()} /> : services.data.items.length === 0 ? <AppEmptyState className="mt-4" icon={Settings2} title={search || readiness !== "__all" || status !== "active" ? "No services found" : "No services added yet"} description={search || readiness !== "__all" || status !== "active" ? "Try clearing your search or filters." : "Add the services your business offers so BizReply can answer customer questions and prepare for bookings."} actionLabel={canManage && !search && readiness === "__all" && status === "active" ? "Add your first service" : undefined} onAction={() => openEditor(null)} /> : <><div className="mt-4 grid gap-4 md:grid-cols-2">{services.data.items.map((service) => <ServiceCard key={service.id} service={service} canManage={canManage} busy={archive.isPending || restore.isPending} onEdit={() => openEditor(service)} onArchive={() => archive.mutate(service.id, { onSuccess: () => systemNotify.success("Service archived"), onError: mutationError })} onRestore={() => restore.mutate(service.id, { onSuccess: () => systemNotify.success("Service restored"), onError: mutationError })} />)}</div>{services.data.pagination.totalPages > 1 && <div className="mt-5 flex items-center justify-between rounded-xl border bg-card p-3"><span className="text-xs text-muted-foreground">Page {page} of {services.data.pagination.totalPages}</span><div className="flex gap-2"><AppButton size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</AppButton><AppButton size="sm" variant="outline" disabled={page >= services.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</AppButton></div></div>}</>}</section><aside className="space-y-5 xl:sticky xl:top-20">{summary.data ? <SummaryCard summary={summary.data} /> : <Skeleton className="h-96 rounded-xl" />}<AppCard className="shadow-none"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><CalendarCheck2 className="size-5" /></span><div><h2 className="text-sm font-bold">Prepare for accurate replies</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Complete service descriptions and prices so BizReply can answer customer questions accurately.</p></div></div>{activeLimit !== null && activeLimit !== undefined && <p className="mt-4 rounded-lg bg-muted p-3 text-xs font-semibold">{summary.data?.active ?? 0} / {activeLimit} active services used</p>}</AppCard></aside></div>
    <ServiceEditor open={editorOpen} onOpenChange={setEditorOpen} onSaved={showSavedService} service={editing} businessId={businessId} defaultCurrency={profile.data?.defaultCurrency ?? "GHS"} />
  </main>;
}
