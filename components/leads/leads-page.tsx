"use client";

import {
  BadgeCheck,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Download,
  Eye,
  FilterX,
  HeartHandshake,
  Layers3,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  PhoneCall,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app-button";
import { AppIsoDatePicker, parseDateValue } from "@/components/app-date-picker";
import { AppEmptyState } from "@/components/app-empty-state";
import { AppErrorState } from "@/components/app-error-state";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { LeadDetailPanel } from "@/components/leads/lead-detail-panel";
import { LeadSearch } from "@/components/search/lead-search";
import { LoadingCard } from "@/components/states/loading-states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCurrentUser } from "@/hooks/use-auth";
import { useDeleteLead, useLeads, useLeadStats } from "@/hooks/use-leads";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatLeadDate, LEAD_SOURCES, LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/leads";
import { cn } from "@/lib/utils";
import type { Lead, LeadListQuery, LeadSortBy, LeadStatus, SortOrder } from "@/types/lead";

const DEFAULT_QUERY: LeadListQuery = { page: 1, limit: 20, sortBy: "createdAt", sortOrder: "desc" };

const STATUS_ICONS: Record<LeadStatus, LucideIcon> = {
  NEW: Sparkles,
  CONTACTED: PhoneCall,
  INTERESTED: HeartHandshake,
  QUALIFIED: BadgeCheck,
  APPOINTMENT_SCHEDULED: CalendarCheck2,
  WON: Trophy,
  LOST: CircleX,
};

function parseQuery(params: URLSearchParams): LeadListQuery {
  return {
    page: Math.max(1, Number(params.get("page")) || DEFAULT_QUERY.page),
    limit: Math.min(100, Math.max(1, Number(params.get("limit")) || DEFAULT_QUERY.limit)),
    search: params.get("search") || undefined,
    status: (params.get("status") || undefined) as LeadListQuery["status"],
    source: (params.get("source") || undefined) as LeadListQuery["source"],
    assignedStaffId: params.get("assignedStaffId") || undefined,
    tag: params.get("tag") || undefined,
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    sortBy: (params.get("sortBy") || DEFAULT_QUERY.sortBy) as LeadSortBy,
    sortOrder: (params.get("sortOrder") || DEFAULT_QUERY.sortOrder) as SortOrder,
  };
}

function getLeadLocation(lead: Lead) {
  const city = lead.customFields?.city;
  const location = lead.customFields?.location;
  if (typeof city === "string" && city.trim()) return city;
  if (typeof location === "string" && location.trim()) return location;
  return null;
}

function getInitials(lead: Lead) {
  if (!lead.assignedStaff) return "UA";
  return `${lead.assignedStaff.user.firstName[0] ?? ""}${lead.assignedStaff.user.lastName[0] ?? ""}`.toUpperCase();
}

export function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = parseQuery(searchParams);
  const leads = useLeads(query);
  const stats = useLeadStats();
  const profile = useCurrentUser();
  const removeLead = useDeleteLead();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selectedLeadId = searchParams.get("lead");
  const canDelete = profile.data?.role !== "STAFF";
  const dateFrom = parseDateValue(query.dateFrom);
  const dateTo = parseDateValue(query.dateTo);

  const setParams = (updates: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    router.push(`/leads?${next.toString()}`);
  };

  const resetFilters = () => router.push("/leads");
  const hasFilters = Boolean(query.search || query.status || query.source || query.tag || query.dateFrom || query.dateTo || query.assignedStaffId);
  const handlePlaceholder = (label: string) => toast.info(`${label} is coming soon`);
  const refresh = async () => {
    await Promise.all([leads.refetch(), stats.refetch()]);
    toast.success("Lead data refreshed");
  };
  const openLead = (id: string) => setParams({ lead: id });
  const closeLead = () => setParams({ lead: undefined });

  return (
    <main className="w-full space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">CRM workspace</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Leads</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Track opportunities and keep every follow-up moving.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppButton variant="outline" onClick={() => handlePlaceholder("Lead import")}><Upload className="size-4" />Import leads</AppButton>
          <AppButton asChild><Link href="/leads/new"><UserPlus className="size-4" />New lead</Link></AppButton>
        </div>
      </header>

      {stats.isPending ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{Array.from({ length: 7 }).map((_, index) => <LoadingCard key={index} className="min-h-24 p-4" />)}</div>
      ) : stats.isError ? (
        <AppErrorState className="min-h-40" title="Could not load lead totals" description={getApiErrorMessage(stats.error)} onRetry={() => stats.refetch()} />
      ) : (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7" aria-label="Lead status summary">
          {LEAD_STATUSES.map((status) => {
            const Icon = STATUS_ICONS[status];
            const selected = query.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setParams({ status: selected ? undefined : status, page: 1 })}
                className={cn(
                  "group min-h-24 rounded-xl border bg-card p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected && "border-primary/30 bg-secondary/55 shadow-none",
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className={cn("grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-secondary group-hover:text-primary", selected && "bg-card text-primary")}><Icon className="size-4" /></span>
                  <span className="text-xl font-bold tabular-nums">{stats.data.byStatus[status]}</span>
                </span>
                <span className="mt-3 block truncate text-xs font-semibold text-muted-foreground">{LEAD_STATUS_LABELS[status]}</span>
              </button>
            );
          })}
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto border-b px-4">
          <nav className="flex min-w-max gap-1" aria-label="Lead status filters">
            <button
              type="button"
              onClick={() => setParams({ status: undefined, page: 1 })}
              className={cn("border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground", !query.status && "border-primary text-primary")}
            >
              All <span className="ml-1 text-xs tabular-nums opacity-65">{stats.data?.total ?? 0}</span>
            </button>
            {LEAD_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setParams({ status, page: 1 })}
                className={cn("border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground", query.status === status && "border-primary text-primary")}
              >
                {LEAD_STATUS_LABELS[status]} <span className="ml-1 text-xs tabular-nums opacity-65">{stats.data?.byStatus[status] ?? 0}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-b bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <AppButton size="sm" variant="outline" onClick={() => handlePlaceholder("Export")}><Download className="size-4" />Export</AppButton>
            <AppButton size="sm" variant="outline" onClick={() => handlePlaceholder("Bulk actions")}><Layers3 className="size-4" />Bulk actions</AppButton>
            <AppButton size="sm" variant="outline" aria-label="Refresh leads" onClick={refresh} loading={leads.isRefetching}><RefreshCw className="size-4" />Refresh</AppButton>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <LeadSearch onSelect={(lead) => openLead(lead.id)} />
            <AppButton size="sm" variant={filtersOpen || hasFilters ? "secondary" : "outline"} onClick={() => setFiltersOpen((open) => !open)}>
              <SlidersHorizontal className="size-4" />Filters{hasFilters ? " active" : ""}
            </AppButton>
            <AppButton size="sm" variant="outline" aria-label="More lead options" onClick={() => handlePlaceholder("More lead options")}><MoreHorizontal className="size-4" /></AppButton>
          </div>
        </div>

        {filtersOpen && (
          <div className="grid gap-3 border-b bg-muted/25 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <AppSelect
              aria-label="Filter by status"
              value={query.status ?? "ALL"}
              options={[{ value: "ALL", label: "All statuses" }, ...LEAD_STATUSES.map((status) => ({ value: status, label: LEAD_STATUS_LABELS[status] }))]}
              onValueChange={(value) => setParams({ status: value === "ALL" ? undefined : value, page: 1 })}
            />
            <AppSelect
              aria-label="Filter by source"
              value={query.source ?? "ALL"}
              options={[{ value: "ALL", label: "All sources" }, ...LEAD_SOURCES.map((source) => ({ value: source, label: LEAD_SOURCE_LABELS[source] }))]}
              onValueChange={(value) => setParams({ source: value === "ALL" ? undefined : value, page: 1 })}
            />
            <AppInput aria-label="Filter by tag" placeholder="Filter by tag" value={query.tag ?? ""} onChange={(event) => setParams({ tag: event.target.value || undefined, page: 1 })} />
            <AppIsoDatePicker
              aria-label="Filter leads created from date"
              value={query.dateFrom}
              onChange={(value) => setParams({ dateFrom: value || undefined, page: 1 })}
              placeholder="Created from"
              disabledDates={dateTo ? { after: dateTo } : undefined}
            />
            <AppIsoDatePicker
              aria-label="Filter leads created to date"
              value={query.dateTo}
              onChange={(value) => setParams({ dateTo: value || undefined, page: 1 })}
              placeholder="Created to"
              disabledDates={dateFrom ? { before: dateFrom } : undefined}
            />
            <AppSelect
              aria-label="Sort leads"
              value={`${query.sortBy}:${query.sortOrder}`}
              options={[
                { value: "createdAt:desc", label: "Newest first" },
                { value: "createdAt:asc", label: "Oldest first" },
                { value: "fullName:asc", label: "Name A–Z" },
                { value: "updatedAt:desc", label: "Recently updated" },
              ]}
              onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split(":");
                setParams({ sortBy, sortOrder, page: 1 });
              }}
            />
            <AppButton variant="outline" onClick={resetFilters}><FilterX className="size-4" />Clear filters</AppButton>
          </div>
        )}

        {leads.isPending ? (
          <div className="grid gap-4 p-4 md:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <LoadingCard key={index} className="min-h-56" />)}</div>
        ) : leads.isError ? (
          <AppErrorState className="m-4" title="Could not load leads" description={getApiErrorMessage(leads.error)} onRetry={() => leads.refetch()} />
        ) : leads.data.data.length === 0 ? (
          <AppEmptyState className="m-4 border-0" icon={UsersRound} title={hasFilters ? "No leads match these filters" : "No leads yet"} description={hasFilters ? "Try clearing or changing your filters." : "Create your first lead to begin building the business CRM."} actionLabel={hasFilters ? "Clear filters" : "Create lead"} onAction={() => hasFilters ? resetFilters() : router.push("/leads/new")} />
        ) : (
          <>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              {leads.data.data.map((lead) => {
                const location = getLeadLocation(lead);
                const assignedName = lead.assignedStaff ? `${lead.assignedStaff.user.firstName} ${lead.assignedStaff.user.lastName}` : "Unassigned";
                return (
                  <article
                    key={lead.id}
                    onClick={(event) => {
                      if (!(event.target as HTMLElement).closest("a,button,input,select,textarea")) openLead(lead.id);
                    }}
                    className="group cursor-pointer rounded-xl border bg-card p-4 transition hover:border-primary/20 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button type="button" onClick={() => openLead(lead.id)} className="block max-w-full cursor-pointer truncate text-left text-base font-bold tracking-tight hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{lead.fullName}</button>
                        <p className="mt-1 text-xs text-muted-foreground">Added {formatLeadDate(lead.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <AppButton size="icon" variant="ghost" aria-label={`View ${lead.fullName}`} onClick={() => openLead(lead.id)}><Eye className="size-4" /></AppButton>
                        <AppButton size="icon" variant="ghost" asChild><Link href={`/leads/${lead.id}/edit`} aria-label={`Edit ${lead.fullName}`}><Pencil className="size-4" /></Link></AppButton>
                        <AppButton size="icon" variant="ghost" aria-label={`More actions for ${lead.fullName}`} onClick={() => handlePlaceholder("More lead actions")}><MoreHorizontal className="size-4" /></AppButton>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <a href={`tel:${lead.phone}`} className="flex min-w-0 items-center gap-2 hover:text-foreground"><Phone className="size-3.5 shrink-0" /><span className="truncate">{lead.phone}</span></a>
                      <span className="flex min-w-0 items-center gap-2"><Mail className="size-3.5 shrink-0" /><span className="truncate">{lead.email ?? "No email provided"}</span></span>
                      {location && <span className="flex min-w-0 items-center gap-2 sm:col-span-2"><MapPin className="size-3.5 shrink-0" /><span className="truncate">{location}</span></span>}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <LeadStatusBadge status={lead.status} />
                      <span className="rounded-md border bg-muted/35 px-2 py-1 text-xs font-medium text-muted-foreground">{LEAD_SOURCE_LABELS[lead.source]}</span>
                      {lead.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-md bg-secondary/65 px-2 py-1 text-xs font-medium text-secondary-foreground">{tag}</span>)}
                      {lead.tags.length > 2 && <span className="text-xs font-medium text-muted-foreground">+{lead.tags.length - 2}</span>}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t pt-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/10 bg-secondary text-xs font-bold text-primary">{getInitials(lead)}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Assigned</p>
                          <p className="truncate text-xs font-semibold">{assignedName}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <AppButton size="sm" variant="ghost" onClick={() => openLead(lead.id)}>View</AppButton>
                        {canDelete && (
                          <ConfirmDialog
                            trigger={<AppButton size="icon" variant="ghost" aria-label={`Delete ${lead.fullName}`}><Trash2 className="size-4 text-destructive" /></AppButton>}
                            title="Delete this lead?"
                            description={`${lead.fullName} will be removed from the active business. This action is soft-delete but cannot be undone from this screen.`}
                            confirmLabel="Delete lead"
                            loading={removeLead.isPending}
                            onConfirm={() => removeLead.mutate(lead.id, { onSuccess: () => toast.success("Lead deleted"), onError: (error) => toast.error("Could not delete lead", { description: getApiErrorMessage(error) }) })}
                          />
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 border-t px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground">Page <span className="font-semibold text-foreground">{leads.data.pagination.page}</span> of <span className="font-semibold text-foreground">{Math.max(1, leads.data.pagination.totalPages)}</span> · {leads.data.pagination.total} leads</p>
              <div className="flex gap-2">
                <AppButton size="sm" variant="outline" disabled={query.page <= 1} onClick={() => setParams({ page: query.page - 1 })}><ChevronLeft className="size-4" />Previous</AppButton>
                <AppButton size="sm" variant="outline" disabled={query.page >= leads.data.pagination.totalPages} onClick={() => setParams({ page: query.page + 1 })}>Next<ChevronRight className="size-4" /></AppButton>
              </div>
            </div>
          </>
        )}
      </section>
      <LeadDetailPanel leadId={selectedLeadId} open={Boolean(selectedLeadId)} onOpenChange={(open) => { if (!open) closeLead(); }} />
    </main>
  );
}
