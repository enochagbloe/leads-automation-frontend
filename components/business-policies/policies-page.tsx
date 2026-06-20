"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  BookOpenCheck,
  Check,
  CircleAlert,
  Eye,
  FileText,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import {
  useArchiveBusinessPolicy,
  useBusinessPolicies,
  useBusinessPoliciesSummary,
  useCreateBusinessPolicy,
  useRestoreBusinessPolicy,
  useUpdateBusinessPolicy,
} from "@/hooks/use-business-policies";
import { useBusinessSetupStatus } from "@/hooks/use-business-setup";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { businessPolicySchema, type BusinessPolicyValues } from "@/schemas/business-policy";
import {
  BUSINESS_POLICY_CATEGORIES,
  type BusinessPoliciesQuery,
  type BusinessPolicy,
  type BusinessPolicyCategory,
  type BusinessPolicyInput,
  type PoliciesSummary,
} from "@/types/business-policy";

const CATEGORY_LABELS: Record<BusinessPolicyCategory, string> = {
  GENERAL: "General",
  PAYMENT: "Payment",
  DEPOSIT: "Deposit",
  REFUND: "Refund",
  CANCELLATION: "Cancellation",
  RESCHEDULING: "Rescheduling",
  LATE_ARRIVAL: "Late arrival",
  NO_SHOW: "No-show",
  TRANSPORTATION: "Transportation",
  SERVICE_AREA: "Service area",
  APPOINTMENT: "Appointment",
  PRIVACY: "Privacy",
  TERMS: "Terms",
  OTHER: "Other",
};
const CATEGORY_OPTIONS = BUSINESS_POLICY_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }));
const CATEGORY_FILTERS = [{ value: "__all", label: "All categories" }, ...CATEGORY_OPTIONS];
const VISIBILITY_OPTIONS = [
  { value: "CUSTOMER_FACING", label: "Customer-facing", description: "BizReply can use this policy in customer replies." },
  { value: "INTERNAL_ONLY", label: "Internal only", description: "Visible to your team, not used in customer replies." },
];
const VISIBILITY_FILTERS = [{ value: "__all", label: "All visibility" }, ...VISIBILITY_OPTIONS.map(({ value, label }) => ({ value, label }))];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All policies" },
];
const DEFAULT_VALUES: BusinessPolicyValues = {
  title: "",
  category: "GENERAL",
  visibility: "CUSTOMER_FACING",
  shortSummary: "",
  content: "",
  priority: "0",
  isActive: true,
};

function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(timer); }, [delay, value]);
  return debounced;
}

function valuesFromPolicy(policy: BusinessPolicy): BusinessPolicyValues {
  return {
    title: policy.title,
    category: policy.category,
    visibility: policy.visibility,
    shortSummary: policy.shortSummary ?? "",
    content: policy.content,
    priority: String(policy.priority),
    isActive: policy.isActive,
  };
}

function toInput(values: BusinessPolicyValues): BusinessPolicyInput {
  return {
    title: values.title.trim(),
    category: values.category,
    visibility: values.visibility,
    shortSummary: values.shortSummary.trim() || null,
    content: values.content.trim(),
    priority: Number(values.priority),
    isActive: values.isActive,
  };
}

function ActiveSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-11 w-full items-center justify-between gap-4 rounded-xl border bg-card px-3.5 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"><span><span className="block text-sm font-semibold">Active policy</span><span className="mt-0.5 block text-xs text-muted-foreground">Inactive policies stay saved but are not used in normal flows.</span></span><span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}><span className={cn("absolute top-1 size-4 rounded-full bg-card shadow-sm transition-transform", checked ? "translate-x-6" : "translate-x-1")} /></span></button>;
}

function PolicyEditor({ open, onOpenChange, policy, businessId, onLimit }: { open: boolean; onOpenChange: (open: boolean) => void; policy: BusinessPolicy | null; businessId: string; onLimit: (error: ApiError) => void }) {
  const create = useCreateBusinessPolicy(businessId);
  const update = useUpdateBusinessPolicy(businessId);
  const form = useForm<BusinessPolicyValues>({ resolver: zodResolver(businessPolicySchema), defaultValues: DEFAULT_VALUES });
  useEffect(() => {
    if (open) form.reset(policy ? valuesFromPolicy(policy) : DEFAULT_VALUES);
  }, [form, open, policy]);
  const submit = form.handleSubmit(async (values) => {
    try {
      await (policy ? update.mutateAsync({ id: policy.id, input: toInput(values) }) : create.mutateAsync(toInput(values)));
      systemNotify.success(policy ? "Policy updated" : "Policy added", { description: values.visibility === "CUSTOMER_FACING" && values.isActive ? "BizReply can now use this policy in customer-facing answers." : "The policy has been saved." });
      onOpenChange(false);
    } catch (error) {
      applyApiFieldErrors(error, form.setError);
      if (error instanceof ApiError && error.code === "POLICY_LIMIT_REACHED") onLimit(error);
      systemNotify.error(error instanceof ApiError && error.code === "FORBIDDEN" ? "You do not have permission to manage policies." : "Could not save policy", { description: getApiErrorMessage(error) });
    }
  });
  const busy = create.isPending || update.isPending;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogPortal><DialogOverlay /><DialogContent className="inset-y-0 right-0 flex h-dvh w-full max-w-xl flex-col border-l bg-background shadow-2xl"><div className="flex items-start justify-between gap-4 border-b bg-card px-5 py-4"><div><DialogTitle className="text-lg font-bold">{policy ? "Edit policy" : "Add policy"}</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">Write a clear rule BizReply and your team can follow consistently.</DialogDescription></div><button type="button" onClick={() => onOpenChange(false)} className="grid size-10 place-items-center rounded-lg hover:bg-muted" aria-label="Close policy editor"><X className="size-4" /></button></div><form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto p-5"><div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><AppFormField id="policy-title" label="Policy title" required error={form.formState.errors.title?.message}><AppInput id="policy-title" placeholder="e.g. Cancellation policy" {...form.register("title")} /></AppFormField></div><Controller name="category" control={form.control} render={({ field }) => <AppFormField id="policy-category" label="Category" required error={form.formState.errors.category?.message}><AppSelect id="policy-category" value={field.value} onValueChange={field.onChange} options={CATEGORY_OPTIONS} /></AppFormField>} /><Controller name="visibility" control={form.control} render={({ field }) => <AppFormField id="policy-visibility" label="Visibility" required error={form.formState.errors.visibility?.message}><AppSelect id="policy-visibility" value={field.value} onValueChange={field.onChange} options={VISIBILITY_OPTIONS} /></AppFormField>} /><div className="sm:col-span-2"><AppFormField id="policy-summary" label="Short summary" hint="Optional. A concise version for quick context." error={form.formState.errors.shortSummary?.message}><textarea id="policy-summary" rows={3} className="w-full resize-y rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20" placeholder="Summarize the policy in one or two sentences." {...form.register("shortSummary")} /></AppFormField></div><div className="sm:col-span-2"><AppFormField id="policy-content" label="Policy content" required hint="Be specific about conditions, timelines, fees, and exceptions." error={form.formState.errors.content?.message}><textarea id="policy-content" rows={8} className="w-full resize-y rounded-lg border border-input bg-card px-3 py-3 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20" placeholder="Write the full policy customers and staff should follow." {...form.register("content")} /></AppFormField></div><AppFormField id="policy-priority" label="Priority" hint="Higher-priority rules can be considered first." error={form.formState.errors.priority?.message}><AppInput id="policy-priority" inputMode="numeric" {...form.register("priority")} /></AppFormField><Controller name="isActive" control={form.control} render={({ field }) => <ActiveSwitch checked={field.value} onChange={field.onChange} />} /></div><div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t bg-background py-4"><AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</AppButton><AppButton type="submit" loading={busy} loadingText="Saving policy">{policy ? "Save changes" : "Add policy"}</AppButton></div></form></DialogContent></DialogPortal></Dialog>;
}

function PolicyCard({ policy, canManage, busy, onEdit, onArchive, onRestore }: { policy: BusinessPolicy; canManage: boolean; busy: boolean; onEdit: () => void; onArchive: () => void; onRestore: () => void }) {
  return <article className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{CATEGORY_LABELS[policy.category]}</span><span className={cn("rounded-md px-2 py-1 text-[10px] font-bold", policy.visibility === "CUSTOMER_FACING" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{policy.visibility === "CUSTOMER_FACING" ? "Customer-facing" : "Internal only"}</span><span className={cn("rounded-md px-2 py-1 text-[10px] font-bold", policy.isArchived ? "bg-muted text-muted-foreground" : policy.isActive ? "bg-secondary text-primary" : "bg-warning/10 text-warning")}>{policy.isArchived ? "Archived" : policy.isActive ? "Active" : "Inactive"}</span></div><h3 className="mt-3 text-base font-bold">{policy.title}</h3></div>{canManage && <div className="flex shrink-0 gap-1">{!policy.isArchived && <AppButton size="icon" variant="ghost" className="size-9 min-h-9" onClick={onEdit} aria-label={`Edit ${policy.title}`}><Pencil className="size-4" /></AppButton>}{policy.isArchived ? <AppButton size="sm" variant="outline" loading={busy} onClick={onRestore}><RotateCcw className="size-3.5" />Restore</AppButton> : <ConfirmDialog trigger={<AppButton size="icon" variant="ghost" className="size-9 min-h-9" aria-label={`Archive ${policy.title}`}><Archive className="size-4" /></AppButton>} title="Archive policy?" description="This policy will stop appearing in active policy lists and will no longer be available for customer-facing guidance." confirmLabel="Archive policy" loading={busy} onConfirm={onArchive} />}</div>}</div><p className="mt-3 text-sm leading-6 text-muted-foreground">{policy.shortSummary || policy.content}</p><div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-xs font-semibold text-muted-foreground"><span>Priority {policy.priority}</span><span>Updated {new Date(policy.updatedAt).toLocaleDateString()}</span><span className="capitalize">{policy.source.toLowerCase().replaceAll("_", " ")}</span></div></article>;
}

function SummaryCard({ summary }: { summary: PoliciesSummary }) {
  const rows = [["Total policies", summary.total], ["Active", summary.active], ["Inactive", summary.inactive], ["Archived", summary.archived], ["Customer-facing", summary.customerFacing], ["Internal only", summary.internalOnly]] as const;
  return <AppCard className="shadow-none"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><BookOpenCheck className="size-5" /></span><div><h2 className="font-bold">Policies summary</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Rules configured for this business.</p></div></div><dl className="mt-5 divide-y">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm font-bold tabular-nums">{value}</dd></div>)}</dl></AppCard>;
}

export function PoliciesPage() {
  const auth = useCurrentUser();
  const businessId = auth.data?.activeBusiness?.id;
  const canManage = auth.data?.membership?.role === "BUSINESS_OWNER" || auth.data?.membership?.role === "MANAGER";
  const setup = useBusinessSetupStatus(businessId);
  const summary = useBusinessPoliciesSummary(businessId);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [category, setCategory] = useState("__all");
  const [visibility, setVisibility] = useState("__all");
  const [status, setStatus] = useState<BusinessPoliciesQuery["status"]>("active");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<BusinessPolicy | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [limitError, setLimitError] = useState<ApiError | null>(null);
  const query = useMemo<BusinessPoliciesQuery>(() => ({
    category: category === "__all" ? undefined : category as BusinessPolicyCategory,
    visibility: canManage ? visibility === "__all" ? undefined : visibility as BusinessPoliciesQuery["visibility"] : "CUSTOMER_FACING",
    status: canManage ? status : "active",
    search: debouncedSearch || undefined,
    page,
    limit: 20,
    sort: "displayOrder",
    sortOrder: "asc",
  }), [canManage, category, debouncedSearch, page, status, visibility]);
  const policies = useBusinessPolicies(businessId, query);
  const archive = useArchiveBusinessPolicy(businessId);
  const restore = useRestoreBusinessPolicy(businessId);
  const openEditor = (policy: BusinessPolicy | null) => { setEditing(policy); setEditorOpen(true); };
  const mutationError = (error: unknown) => {
    if (error instanceof ApiError && error.code === "POLICY_LIMIT_REACHED") setLimitError(error);
    systemNotify.error(error instanceof ApiError && error.code === "FORBIDDEN" ? "You do not have permission to manage policies." : "Could not update policy", { description: getApiErrorMessage(error) });
  };

  if (auth.isPending) return <main className="p-6"><Skeleton className="h-[700px] rounded-xl" /></main>;
  if (!businessId) return <main className="p-6"><AppErrorState title="No active business" description="Select a business to manage its policies." /></main>;
  const missing = summary.data?.missingRecommendedCategories ?? [];
  return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Policies</h1><p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">Add the rules BizReply should follow when answering customers about payments, cancellations, refunds, and service terms.</p></div>{canManage && <AppButton onClick={() => openEditor(null)}><Plus className="size-4" />Add policy</AppButton>}</header><BusinessSetupTabs activeKey="policies" className="mt-5" />
    {limitError && <UpgradePrompt className="mt-6" message={limitError.message} recommendedPlan={limitError.recommendedPlan} />}
    <AppCard className="mt-6 shadow-none"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Sparkles className="size-5" /></span><div><h2 className="font-bold">Policy readiness</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{summary.data?.customerFacing ? `${summary.data.customerFacing} customer-facing ${summary.data.customerFacing === 1 ? "policy is" : "policies are"} ready for BizReply to reference.` : "Add an active customer-facing policy so BizReply can answer sensitive customer questions consistently."}</p></div></div><div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-lg bg-muted px-3 py-2">Recommended categories missing: {missing.length}</span><span className="rounded-lg bg-secondary px-3 py-2 text-primary">Setup: {setup.data?.completionPercentage ?? 0}%</span></div></div></AppCard>
    <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"><section><div className="flex flex-col gap-3 rounded-xl border bg-card p-3 lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><AppInput value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search policies" className="pl-9" /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex"><AppSelect value={category} onValueChange={(value) => { setCategory(value); setPage(1); }} options={CATEGORY_FILTERS} className="lg:w-40" />{canManage && <AppSelect value={visibility} onValueChange={(value) => { setVisibility(value); setPage(1); }} options={VISIBILITY_FILTERS} className="lg:w-40" />}{canManage && <AppSelect value={status} onValueChange={(value) => { setStatus(value as BusinessPoliciesQuery["status"]); setPage(1); }} options={STATUS_OPTIONS} className="lg:w-36" />}<AppButton size="icon" variant="outline" onClick={() => void Promise.all([policies.refetch(), summary.refetch()])} aria-label="Refresh policies"><RefreshCw className={cn("size-4", policies.isFetching && "animate-spin")} /></AppButton></div></div>
      {policies.isPending ? <div className="mt-4 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-52 rounded-xl" />)}</div> : policies.isError ? <AppErrorState className="mt-4" title="Could not load policies" description={getApiErrorMessage(policies.error)} onRetry={() => void policies.refetch()} /> : policies.data.items.length === 0 ? <AppEmptyState className="mt-4" icon={FileText} title={search || category !== "__all" || visibility !== "__all" || status !== "active" ? "No policies found" : "No policies added yet"} description={search || category !== "__all" || visibility !== "__all" || status !== "active" ? "Try clearing your search or filters." : canManage ? "Add your first policy so BizReply and your team can follow the same business rules." : "Your business has not published any customer-facing policies yet."} actionLabel={canManage && !search && category === "__all" && visibility === "__all" && status === "active" ? "Add your first policy" : undefined} onAction={() => openEditor(null)} /> : <><div className="mt-4 grid gap-4 md:grid-cols-2">{policies.data.items.map((policy) => <PolicyCard key={policy.id} policy={policy} canManage={canManage} busy={archive.isPending || restore.isPending} onEdit={() => openEditor(policy)} onArchive={() => archive.mutate(policy.id, { onSuccess: () => { setLimitError(null); systemNotify.success("Policy archived"); }, onError: mutationError })} onRestore={() => restore.mutate(policy.id, { onSuccess: () => systemNotify.success("Policy restored"), onError: mutationError })} />)}</div>{policies.data.pagination.totalPages > 1 && <div className="mt-5 flex items-center justify-between rounded-xl border bg-card p-3"><span className="text-xs text-muted-foreground">Page {page} of {policies.data.pagination.totalPages}</span><div className="flex gap-2"><AppButton size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</AppButton><AppButton size="sm" variant="outline" disabled={page >= policies.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</AppButton></div></div>}</>}</section><aside className="space-y-5 xl:sticky xl:top-20">{summary.isError ? <AppErrorState title="Could not load policy summary" description={getApiErrorMessage(summary.error)} onRetry={() => void summary.refetch()} /> : summary.data ? <SummaryCard summary={summary.data} /> : <Skeleton className="h-80 rounded-xl" />}<AppCard className="shadow-none"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning/10 text-warning"><CircleAlert className="size-5" /></span><div><h2 className="font-bold">Recommended coverage</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">These policy categories help BizReply answer common customer questions safely.</p></div></div><div className="mt-4 flex flex-wrap gap-2">{(missing.length ? missing : summary.data?.categoriesConfigured ?? []).map((item) => <span key={item} className={cn("rounded-lg px-2.5 py-1.5 text-[11px] font-semibold", missing.length ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>{missing.length ? CATEGORY_LABELS[item] : <><Check className="mr-1 inline size-3" />{CATEGORY_LABELS[item]}</>}</span>)}</div></AppCard><AppCard className="shadow-none"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">{canManage ? <Eye className="size-5" /> : <LockKeyhole className="size-5" />}</span><div><h2 className="text-sm font-bold">{canManage ? "Choose visibility carefully" : "Customer-facing policies"}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{canManage ? "Customer-facing policies may be used in replies. Keep internal operating rules marked internal only." : "Staff can view active customer-facing policies. Owners and managers maintain policy settings."}</p></div></div>{!canManage && <p className="mt-4 flex items-center gap-2 rounded-lg bg-muted p-3 text-xs font-semibold text-muted-foreground"><ShieldCheck className="size-3.5" />Read-only access</p>}</AppCard></aside></div>
    <PolicyEditor open={editorOpen} onOpenChange={setEditorOpen} policy={editing} businessId={businessId} onLimit={(error) => { setLimitError(error); setEditorOpen(false); }} />
  </main>;
}
