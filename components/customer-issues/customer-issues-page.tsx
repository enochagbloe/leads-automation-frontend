"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert, Clock3, ExternalLink, Inbox, MessageSquareText, MoreVertical, RotateCcw, Search, ShieldAlert, Tag, UserCheck, UserRound, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { systemNotify } from "@/lib/system-notifications";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { AppEmptyState } from "@/components/app-empty-state";
import { AppErrorState } from "@/components/app-error-state";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { LoadingCard } from "@/components/states/loading-states";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCustomerIssue, useCustomerIssues, useUpdateCustomerIssueStatus } from "@/hooks/use-customer-issues";
import { useLead } from "@/hooks/use-leads";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import {
  CUSTOMER_ISSUE_CATEGORIES,
  CUSTOMER_ISSUE_CATEGORY_LABELS,
  CUSTOMER_ISSUE_SEVERITIES,
  CUSTOMER_ISSUE_SEVERITY_LABELS,
  CUSTOMER_ISSUE_STATUSES,
  CUSTOMER_ISSUE_STATUS_LABELS,
  CUSTOMER_ISSUE_TYPE_LABELS,
  customerIssueSeverityTone,
  customerIssueStatusTone,
  formatCustomerIssueTime,
} from "@/lib/customer-issues";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query-keys";
import { canAccessCustomerIssues, canManageBilling, canUpdateCustomerIssueStatus } from "@/lib/workspace-permissions";
import type { CustomerIssue, CustomerIssueCategory, CustomerIssueListQuery, CustomerIssueSeverity, CustomerIssueStatus } from "@/types/customer-issue";
import type { BusinessRole } from "@/types/auth";
import type { Lead } from "@/types/lead";

type IssueTab = NonNullable<CustomerIssueListQuery["tab"]>;

const TABS: Array<{ key: IssueTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "assigned-to-me", label: "Assigned to Me" },
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
];

function parseQuery(params: URLSearchParams): CustomerIssueListQuery {
  const status = params.get("status");
  const severity = params.get("severity");
  const category = params.get("category");
  const tab = params.get("tab");
  return {
    page: Math.max(1, Number(params.get("page")) || 1),
    limit: Math.min(100, Math.max(1, Number(params.get("limit")) || 20)),
    status: CUSTOMER_ISSUE_STATUSES.includes(status as CustomerIssueStatus) ? status as CustomerIssueStatus : undefined,
    severity: CUSTOMER_ISSUE_SEVERITIES.includes(severity as CustomerIssueSeverity) ? severity as CustomerIssueSeverity : undefined,
    category: CUSTOMER_ISSUE_CATEGORIES.includes(category as CustomerIssueCategory) ? category as CustomerIssueCategory : undefined,
    search: params.get("search")?.trim() || undefined,
    tab: TABS.some((item) => item.key === tab) ? tab as IssueTab : "all",
  };
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold", className)}>{children}</span>;
}

function StatusPill({ status }: { status: CustomerIssueStatus }) {
  return <Pill className={customerIssueStatusTone(status)}>{CUSTOMER_ISSUE_STATUS_LABELS[status]}</Pill>;
}

function SeverityPill({ severity }: { severity: CustomerIssueSeverity }) {
  return <Pill className={customerIssueSeverityTone(severity)}>{CUSTOMER_ISSUE_SEVERITY_LABELS[severity]}</Pill>;
}

function customerName(issue: CustomerIssue, fallbackLead?: Lead | null) {
  return issue.lead?.name || fallbackLead?.fullName || issue.lead?.phone || fallbackLead?.phone || "Customer details unavailable";
}

function responsibleLabel(issue: CustomerIssue) {
  if (issue.responsibleMember?.name) return `Assigned to ${issue.responsibleMember.name}`;
  if (issue.suggestedResponsibleMembershipId) return "Suggested responsible staff";
  return "Unassigned";
}

function categoryLabel(issue: CustomerIssue) {
  return CUSTOMER_ISSUE_CATEGORY_LABELS[issue.category] ?? issue.category ?? "Other";
}

function typeLabel(issue: CustomerIssue) {
  return CUSTOMER_ISSUE_TYPE_LABELS[issue.type] ?? issue.type ?? "Issue";
}

function canUseManagerIssueActions(role?: BusinessRole | null) {
  return role === "BUSINESS_OWNER" || role === "MANAGER";
}

function nextActions(status: CustomerIssueStatus, canUpdate: boolean, canUseManagerActions: boolean) {
  if (!canUpdate || status === "CLOSED") return [];
  if (status === "OPEN") return [
    { label: "Acknowledge", status: "ACKNOWLEDGED" as const },
    { label: "Mark Resolved", status: "RESOLVED" as const },
    ...(canUseManagerActions ? [{ label: "Close", status: "CLOSED" as const }] : []),
  ];
  if (status === "ACKNOWLEDGED") return [
    { label: "Mark Resolved", status: "RESOLVED" as const },
    ...(canUseManagerActions ? [{ label: "Close", status: "CLOSED" as const }] : []),
  ];
  if (status === "REOPENED") return [
    { label: "Acknowledge", status: "ACKNOWLEDGED" as const },
    { label: "Mark Resolved", status: "RESOLVED" as const },
    ...(canUseManagerActions ? [{ label: "Close", status: "CLOSED" as const }] : []),
  ];
  if (status === "RESOLVED" && canUseManagerActions) return [
    { label: "Reopen", status: "REOPENED" as const },
    { label: "Close", status: "CLOSED" as const },
  ];
  return [];
}

function issueErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return getApiErrorMessage(error);
  const messages: Record<string, string> = {
    FORBIDDEN: "You do not have permission to manage this issue.",
    CUSTOMER_ISSUE_NOT_FOUND: "This issue was not found or your access was removed.",
    CUSTOMER_ISSUE_STATE_CHANGED: "This complaint changed. Refresh and try again.",
    INVALID_CUSTOMER_ISSUE_STATUS_TRANSITION: "That status change is no longer available. Refresh the issue and try again.",
    CUSTOMER_ISSUE_CLOSED: "This complaint is closed and cannot be changed.",
    PLAN_UPGRADE_REQUIRED: "Customer issue tracking is available on Plus and Premium plans.",
    BUSINESS_ACCESS_DENIED: "You do not have access to this business.",
    VALIDATION_ERROR: error.message,
  };
  if (error.status === 404) return "This issue was not found or your access was removed.";
  return messages[error.code] ?? error.message;
}

function statusChangeDescription(previous?: CustomerIssueStatus | null, next?: CustomerIssueStatus | null) {
  if (previous && next) return `${CUSTOMER_ISSUE_STATUS_LABELS[previous] ?? previous} to ${CUSTOMER_ISSUE_STATUS_LABELS[next] ?? next}`;
  if (next) return `Changed to ${CUSTOMER_ISSUE_STATUS_LABELS[next] ?? next}`;
  return "The complaint status changed.";
}

function timelineTitle(type?: string, fallback?: string, reopenSource?: string | null) {
  const normalized = type?.toUpperCase() ?? "";
  if (reopenSource === "MANAGER_ACTION") return "Manually reopened by manager";
  if (reopenSource || normalized.includes("REOPEN")) return "Reopened from customer follow-up";
  if (normalized.includes("STATUS")) return "Status updated";
  if (normalized.includes("INTELLIGENCE") || normalized.includes("CATEGORY") || normalized.includes("SEVERITY")) return "Complaint intelligence updated";
  if (normalized.includes("MESSAGE")) return "Customer message linked";
  return fallback || "Complaint activity";
}

function timelineItems(issue: CustomerIssue) {
  const eventItems = (issue.timelineEvents ?? []).map((event) => ({
    key: event.id ?? `${event.type ?? "event"}-${event.createdAt ?? event.timestamp ?? Math.random()}`,
    icon: event.reopenSource || event.newStatus === "REOPENED" ? RotateCcw : event.newStatus === "RESOLVED" ? CheckCircle2 : Clock3,
    title: timelineTitle(event.type, event.title, event.reopenSource),
    time: formatCustomerIssueTime(event.createdAt ?? event.timestamp),
    description: event.description || event.message || statusChangeDescription(event.previousStatus, event.newStatus),
  }));
  const messageItems = (issue.issueMessages ?? []).map((message) => {
    const body = message.body || message.text || message.content || "Message content is not available.";
    const status = message.deliveryStatus ? ` Delivery: ${message.deliveryStatus.toLowerCase()}.` : "";
    return {
      key: `message-${message.id}`,
      icon: MessageSquareText,
      title: message.direction === "OUTBOUND" ? "Resolution message created" : "Customer message linked",
      time: formatCustomerIssueTime(message.createdAt),
      description: `${body}${status}`,
    };
  });
  if (eventItems.length || messageItems.length) return [...eventItems, ...messageItems];
  return [
    { key: "created", icon: MessageSquareText, title: "Issue detected from customer message", time: formatCustomerIssueTime(issue.createdAt), description: issue.customerMessageExcerpt || "A customer interaction was flagged for internal review." },
    { key: "routing", icon: UserCheck, title: responsibleLabel(issue), time: formatCustomerIssueTime(issue.updatedAt), description: issue.routingReason || "Responsible ownership can be adjusted by the team." },
    ...(issue.resolvedAt ? [{ key: "resolved", icon: CheckCircle2, title: "Issue resolved", time: formatCustomerIssueTime(issue.resolvedAt), description: "This issue has been marked resolved by the team." }] : []),
  ];
}

function UpgradeState({ showBillingAction }: { showBillingAction: boolean }) {
  return (
    <main className="grid min-h-[calc(100dvh-4rem)] place-items-center p-6">
      <AppCard className="max-w-xl text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-secondary text-primary"><CircleAlert className="size-5" /></span>
        <h1 className="mt-5 text-xl font-bold">Customer issue tracking is available on Plus and Premium plans.</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Upgrade to unlock AI complaint detection, internal issue routing, and staff notifications.
        </p>
        {showBillingAction ? (
          <AppButton asChild className="mt-6">
            <Link href="/settings/billing">Upgrade plan <ArrowRight className="size-4" /></Link>
          </AppButton>
        ) : (
          <p className="mt-5 rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">Contact your organization to upgrade this feature.</p>
        )}
      </AppCard>
    </main>
  );
}

function IssueCard({
  issue,
  selected,
  canUpdate,
  canUseManagerActions,
  updating,
  onOpen,
  onStatus,
}: {
  issue: CustomerIssue;
  selected: boolean;
  canUpdate: boolean;
  canUseManagerActions: boolean;
  updating: boolean;
  onOpen: () => void;
  onStatus: (status: CustomerIssueStatus) => void;
}) {
  const actions = nextActions(issue.status, canUpdate, canUseManagerActions);
  return (
    <article className={cn("rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/25", selected && "border-primary/35 bg-secondary/20")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={issue.status} />
            <SeverityPill severity={issue.severity} />
            <Pill className="bg-muted text-muted-foreground">{typeLabel(issue)}</Pill>
          </div>
          <h2 className="mt-3 text-base font-bold leading-6">{issue.summary}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{issue.customerMessageExcerpt || issue.routingReason || "AI-created customer issue record."}</p>
        </button>
        <div className="flex shrink-0 flex-wrap gap-2">
          <AppButton variant="outline" size="sm" onClick={onOpen}>View</AppButton>
          {actions.map((action) => (
            <AppButton key={action.status} size="sm" variant={action.status === "RESOLVED" ? "default" : "outline"} loading={updating} onClick={() => onStatus(action.status)}>
              {action.label}
            </AppButton>
          ))}
        </div>
      </div>
      <dl className="mt-5 grid gap-3 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
        <div><dt className="font-bold text-foreground">Customer</dt><dd className="mt-1 truncate">{customerName(issue)}</dd></div>
        <div><dt className="font-bold text-foreground">Category</dt><dd className="mt-1">{categoryLabel(issue)}</dd></div>
        <div><dt className="font-bold text-foreground">Responsible</dt><dd className="mt-1 truncate">{responsibleLabel(issue)}</dd></div>
        <div><dt className="font-bold text-foreground">Created</dt><dd className="mt-1">{formatCustomerIssueTime(issue.createdAt)}</dd></div>
      </dl>
    </article>
  );
}

function IssueDetailPanel({
  businessId,
  issueId,
  canUpdate,
  canUseManagerActions,
  onClose,
  onStatus,
  updating,
}: {
  businessId: string;
  issueId: string | null;
  canUpdate: boolean;
  canUseManagerActions: boolean;
  onClose: () => void;
  onStatus: (issueId: string, status: CustomerIssueStatus) => void;
  updating: boolean;
}) {
  const detail = useCustomerIssue(businessId, issueId);
  const issue = detail.data;
  const leadFallback = useLead(issue?.leadId && (!issue.lead?.name || !issue.lead?.phone) ? issue.leadId : "");
  const fallbackLead = leadFallback.data?.lead ?? null;
  const [activeDetailTab, setActiveDetailTab] = useState<"activity" | "customer" | "routing" | "actions">("activity");

  return (
    <aside className={cn("fixed inset-y-0 right-0 z-[90] h-dvh w-full max-w-xl translate-x-full overflow-hidden border bg-background shadow-2xl transition-transform duration-200 sm:right-3 sm:top-3 sm:h-[calc(100dvh-1.5rem)] sm:rounded-2xl", issueId && "translate-x-0")} aria-label="Customer issue detail">
      <div className="flex h-full flex-col rounded-[inherit]">
        <div className="flex h-14 items-center justify-between gap-3 border-b bg-card px-3">
          <AppButton size="icon" variant="ghost" onClick={onClose} aria-label="Close issue detail"><X className="size-5" /></AppButton>
          <div className="flex items-center gap-1">
            <AppButton size="icon" variant="ghost" disabled aria-label="Issue activity"><Clock3 className="size-4" /></AppButton>
            <AppButton size="icon" variant="ghost" disabled aria-label="More issue options"><MoreVertical className="size-4" /></AppButton>
          </div>
        </div>
        {detail.isPending ? (
          <div className="space-y-4 p-4"><LoadingCard /><LoadingCard /></div>
        ) : detail.isError ? (
          <div className="p-4"><AppErrorState title="Could not load issue" description={issueErrorMessage(detail.error)} onRetry={() => void detail.refetch()} /></div>
        ) : issue ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="px-5 pb-5 pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Customer issue</p>
              <h3 className="mt-3 text-2xl font-bold leading-8 tracking-tight">{issue.summary}</h3>
              <div className="mt-5 space-y-3 text-sm">
                <PanelMetaRow icon={Clock3} label="Created time" value={formatCustomerIssueTime(issue.createdAt)} />
                <PanelMetaRow icon={CheckCircle2} label="Status" value={<StatusPill status={issue.status} />} />
                <PanelMetaRow icon={ShieldAlert} label="Severity" value={<SeverityPill severity={issue.severity} />} />
                <PanelMetaRow icon={Tag} label="Category" value={<Pill className="bg-muted text-muted-foreground">{categoryLabel(issue)}</Pill>} />
                <PanelMetaRow icon={UserCheck} label="Responsible" value={responsibleLabel(issue)} />
                <PanelMetaRow icon={UserRound} label="Customer" value={customerName(issue, fallbackLead)} />
              </div>
              <div className="mt-6 rounded-2xl bg-muted/55 p-4">
                <h4 className="text-sm font-bold">Customer message</h4>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {issue.customerMessageExcerpt || issue.routingReason || "BizReply created this issue from customer context and internal routing signals."}
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {issue.conversationId && (
                  <AppButton asChild variant="outline" size="sm">
                    <Link href={`/conversations?conversationId=${issue.conversationId}`}>Open conversation <ExternalLink className="size-4" /></Link>
                  </AppButton>
                )}
                {issue.leadId && (
                  <AppButton asChild variant="outline" size="sm">
                    <Link href={`/leads?lead=${issue.leadId}`}>Open lead <ExternalLink className="size-4" /></Link>
                  </AppButton>
                )}
              </div>
            </section>

            <nav className="sticky top-0 z-10 flex border-y bg-background/95 px-5 backdrop-blur" aria-label="Issue detail tabs">
              {[
                ["activity", "Activity"],
                ["customer", "Customer"],
                ["routing", "Routing"],
                ["actions", "Actions"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveDetailTab(key as typeof activeDetailTab)}
                  className={cn("min-h-12 border-b-2 border-transparent px-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground", activeDetailTab === key && "border-primary text-primary")}
                >
                  {label}
                </button>
              ))}
            </nav>

            <section className="px-5 py-5">
              {activeDetailTab === "activity" && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Today</p>
                  <ol className="mt-4 space-y-4">
                    {timelineItems(issue).map((item) => <TimelineItem key={item.key} icon={item.icon} title={item.title} time={item.time} description={item.description} />)}
                  </ol>
                </div>
              )}
              {activeDetailTab === "customer" && (
                <div className="grid gap-3">
                  <DetailRow label="Customer" value={customerName(issue, fallbackLead)} icon={UserRound} />
                  <DetailRow label="Client owner" value={issue.clientOwner?.name ?? "Not provided"} icon={UserRound} />
                  <DetailRow label="Lead" value={issue.lead?.phone ?? fallbackLead?.phone ?? fallbackLead?.email ?? issue.leadId ?? "Not provided"} icon={UserRound} />
                </div>
              )}
              {activeDetailTab === "routing" && (
                <div className="grid gap-3">
                  <DetailRow label="Issue type" value={typeLabel(issue)} icon={AlertTriangle} />
                  <DetailRow label="Routing reason" value={issue.routingReason ?? "Not provided"} icon={AlertTriangle} />
                  <DetailRow label="Updated" value={formatCustomerIssueTime(issue.updatedAt)} icon={Clock3} />
                </div>
              )}
              {activeDetailTab === "actions" && (
                <div>
                  <h4 className="text-sm font-bold">Status actions</h4>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Move this issue forward without leaving the page.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {nextActions(issue.status, canUpdate, canUseManagerActions).length ? nextActions(issue.status, canUpdate, canUseManagerActions).map((action) => (
                      <AppButton key={action.status} size="sm" loading={updating} variant={action.status === "RESOLVED" ? "default" : "outline"} onClick={() => onStatus(issue.id, action.status)}>
                        {action.label}
                      </AppButton>
                    )) : <p className="text-sm text-muted-foreground">No status actions are available for this issue.</p>}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function PanelMetaRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: LucideIcon }) {
  return (
    <div className="grid grid-cols-[1rem_minmax(7rem,0.42fr)_minmax(0,1fr)] items-center gap-3">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function TimelineItem({ title, time, description, icon: Icon }: { title: string; time: string; description: string; icon: LucideIcon }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Icon className="size-4" /></span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{time}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-4" /></span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-muted-foreground">{label}</p>
        <p className="mt-1 break-words font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function CustomerIssuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const profile = useCurrentUser();
  const query = parseQuery(searchParams);
  const activeTab = query.tab ?? "all";
  const currentMembershipId = profile.data?.membership?.id;
  const requestQuery: CustomerIssueListQuery = {
    ...query,
    ...(activeTab === "assigned-to-me" && currentMembershipId ? { responsibleMembershipId: currentMembershipId } : {}),
    ...(activeTab === "open" ? { status: "OPEN" } : {}),
    ...(activeTab === "resolved" ? { status: "RESOLVED" } : {}),
  };
  const activeBusinessId = profile.data?.activeBusiness?.id;
  const billingAllowed = canManageBilling(profile.data);
  const canAccess = canAccessCustomerIssues(profile.data);
  const canUpdate = canUpdateCustomerIssueStatus(profile.data);
  const canUseManagerActions = canUseManagerIssueActions(profile.data?.membership?.role);
  const selectedIssueId = searchParams.get("issue");
  const issues = useCustomerIssues(activeBusinessId, requestQuery, Boolean(profile.data && canAccess));
  const updateStatus = useUpdateCustomerIssueStatus(activeBusinessId);
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);

  const setParams = (updates: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    router.push(`/customer-issues?${next.toString()}`);
  };

  const handleStatus = (issueId: string, status: CustomerIssueStatus) => {
    setUpdatingIssueId(issueId);
    updateStatus.mutate({ issueId, status }, {
      onSuccess: () => systemNotify.success(`Issue marked ${CUSTOMER_ISSUE_STATUS_LABELS[status].toLowerCase()}.`),
      onError: (error) => {
        systemNotify.error("Could not update issue", { description: issueErrorMessage(error) });
        if (error instanceof ApiError && ["CUSTOMER_ISSUE_STATE_CHANGED", "INVALID_CUSTOMER_ISSUE_STATUS_TRANSITION", "CUSTOMER_ISSUE_CLOSED"].includes(error.code)) {
          if (activeBusinessId) {
            void Promise.all([
              queryClient.invalidateQueries({ queryKey: queryKeys.customerIssues.business(activeBusinessId) }),
              queryClient.invalidateQueries({ queryKey: queryKeys.customerIssues.detail(activeBusinessId, issueId) }),
            ]);
          }
          void issues.refetch();
        }
      },
      onSettled: () => setUpdatingIssueId(null),
    });
  };

  if (profile.isPending) return <main className="space-y-4 p-4 sm:p-6 lg:p-8"><LoadingCard className="min-h-40" /><LoadingCard className="min-h-80" /></main>;
  if (!activeBusinessId) return <AppErrorState title="No active business" description="Select a business before viewing customer issues." />;
  if (!canAccess) {
    return (
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center p-6">
        <AppErrorState title="You do not have permission to access this area." description="Switch workspace or ask an owner or manager to update your access." />
      </main>
    );
  }

  const page = issues.data?.pagination?.page ?? query.page ?? 1;
  const totalPages = issues.data?.pagination?.totalPages ?? 1;

  return (
    <main className="relative min-h-[calc(100dvh-4rem)] space-y-5 p-4 sm:p-6 lg:p-8">
      <header>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">AI complaint routing</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Customer Issues</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review AI-detected customer complaints and internal action items without turning BizReply into a task board.
          </p>
        </div>
      </header>

      <section className="flex gap-2 overflow-x-auto border-b" aria-label="Issue tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setParams({ tab: tab.key, page: 1, status: undefined })}
            className={cn("min-h-11 shrink-0 border-b-2 border-transparent px-1 text-sm font-bold text-muted-foreground transition hover:text-foreground", activeTab === tab.key && "border-primary text-primary")}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <AppCard className="shadow-none">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-4 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <AppInput
              value={query.search ?? ""}
              onChange={(event) => setParams({ search: event.target.value, page: 1 })}
              placeholder="Search complaints"
              className="pl-9"
              aria-label="Search issues by summary, customer message, lead, phone, category, subcategory, or conversation ID"
            />
          </div>
          <AppSelect
            value={query.status ?? "all"}
            onValueChange={(value) => setParams({ status: value === "all" ? undefined : value, page: 1 })}
            aria-label="Filter issues by status"
            options={[{ value: "all", label: "All statuses" }, ...CUSTOMER_ISSUE_STATUSES.map((status) => ({ value: status, label: CUSTOMER_ISSUE_STATUS_LABELS[status] }))]}
          />
          <AppSelect
            value={query.severity ?? "all"}
            onValueChange={(value) => setParams({ severity: value === "all" ? undefined : value, page: 1 })}
            aria-label="Filter issues by severity"
            options={[{ value: "all", label: "All severities" }, ...CUSTOMER_ISSUE_SEVERITIES.map((severity) => ({ value: severity, label: CUSTOMER_ISSUE_SEVERITY_LABELS[severity] }))]}
          />
          <AppSelect
            value={query.category ?? "all"}
            onValueChange={(value) => setParams({ category: value === "all" ? undefined : value, page: 1 })}
            aria-label="Filter issues by category"
            options={[{ value: "all", label: "All categories" }, ...CUSTOMER_ISSUE_CATEGORIES.map((category) => ({ value: category, label: CUSTOMER_ISSUE_CATEGORY_LABELS[category] }))]}
          />
        </div>
      </AppCard>

      {issues.isPending ? (
        <div className="grid gap-3">{Array.from({ length: 4 }).map((_, index) => <LoadingCard key={index} className="min-h-40" />)}</div>
      ) : issues.isError ? (
        issues.error instanceof ApiError && issues.error.code === "PLAN_UPGRADE_REQUIRED" ? <UpgradeState showBillingAction={billingAllowed} /> : <AppErrorState title="Could not load customer issues" description={issueErrorMessage(issues.error)} onRetry={() => void issues.refetch()} />
      ) : issues.data.data.length === 0 ? (
        <AppEmptyState
          icon={activeTab === "assigned-to-me" ? UserRound : Inbox}
          title={activeTab === "assigned-to-me" ? "No issues assigned to you." : activeTab === "open" ? "No open customer issues." : "No customer issues found."}
          description={activeTab === "assigned-to-me" ? "Issues routed to you by AI will appear here." : "When AI detects customer complaints or service issues, they will appear here."}
        />
      ) : (
        <section className="grid gap-3" aria-label="Customer issues list">
          {issues.data.data.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              selected={selectedIssueId === issue.id}
              canUpdate={canUpdate}
              canUseManagerActions={canUseManagerActions}
              updating={updatingIssueId === issue.id && updateStatus.isPending}
              onOpen={() => setParams({ issue: issue.id })}
              onStatus={(status) => handleStatus(issue.id, status)}
            />
          ))}
        </section>
      )}

      {issues.data?.pagination && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <AppButton variant="outline" size="sm" disabled={page <= 1} onClick={() => setParams({ page: page - 1 })}>Previous</AppButton>
            <AppButton variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setParams({ page: page + 1 })}>Next</AppButton>
          </div>
        </div>
      )}

      {selectedIssueId && (
        <div
          className="fixed left-0 top-0 z-[80] h-dvh w-screen bg-foreground/15 backdrop-blur-sm"
          onClick={() => setParams({ issue: undefined })}
        />
      )}
      <IssueDetailPanel
        businessId={activeBusinessId}
        issueId={selectedIssueId}
        canUpdate={canUpdate}
        canUseManagerActions={canUseManagerActions}
        updating={Boolean(selectedIssueId && updatingIssueId === selectedIssueId && updateStatus.isPending)}
        onClose={() => setParams({ issue: undefined })}
        onStatus={handleStatus}
      />
    </main>
  );
}
