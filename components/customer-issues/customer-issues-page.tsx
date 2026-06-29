"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, CircleAlert, Clock3, ExternalLink, Inbox, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { systemNotify } from "@/lib/system-notifications";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { AppEmptyState } from "@/components/app-empty-state";
import { AppErrorState } from "@/components/app-error-state";
import { AppSelect } from "@/components/app-select";
import { LoadingCard } from "@/components/states/loading-states";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCustomerIssue, useCustomerIssues, useUpdateCustomerIssueStatus } from "@/hooks/use-customer-issues";
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
import { canAccessCustomerIssues, canManageBilling, canUpdateCustomerIssueStatus } from "@/lib/workspace-permissions";
import type { CustomerIssue, CustomerIssueCategory, CustomerIssueListQuery, CustomerIssueSeverity, CustomerIssueStatus } from "@/types/customer-issue";

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

function customerName(issue: CustomerIssue) {
  return issue.lead?.name || issue.lead?.phone || "Unknown customer";
}

function responsibleLabel(issue: CustomerIssue) {
  if (issue.responsibleMember?.name) return `Assigned to ${issue.responsibleMember.name}`;
  if (issue.suggestedResponsibleMembershipId) return "Suggested responsible staff";
  return "Unassigned";
}

function nextActions(status: CustomerIssueStatus, canUpdate: boolean) {
  if (!canUpdate || status === "CLOSED") return [];
  if (status === "OPEN") return [
    { label: "Acknowledge", status: "ACKNOWLEDGED" as const },
    { label: "Mark Resolved", status: "RESOLVED" as const },
  ];
  if (status === "ACKNOWLEDGED") return [{ label: "Mark Resolved", status: "RESOLVED" as const }];
  if (status === "RESOLVED") return [{ label: "Close", status: "CLOSED" as const }];
  return [];
}

function issueErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return getApiErrorMessage(error);
  const messages: Record<string, string> = {
    FORBIDDEN: "You do not have permission to manage this issue.",
    CUSTOMER_ISSUE_NOT_FOUND: "This customer issue could not be found.",
    PLAN_UPGRADE_REQUIRED: "Customer issue tracking is available on Plus and Premium plans.",
    BUSINESS_ACCESS_DENIED: "You do not have access to this business.",
    VALIDATION_ERROR: error.message,
  };
  return messages[error.code] ?? error.message;
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
  updating,
  onOpen,
  onStatus,
}: {
  issue: CustomerIssue;
  selected: boolean;
  canUpdate: boolean;
  updating: boolean;
  onOpen: () => void;
  onStatus: (status: CustomerIssueStatus) => void;
}) {
  const actions = nextActions(issue.status, canUpdate);
  return (
    <article className={cn("rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/25", selected && "border-primary/35 bg-secondary/20")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={issue.status} />
            <SeverityPill severity={issue.severity} />
            <Pill className="bg-muted text-muted-foreground">{CUSTOMER_ISSUE_TYPE_LABELS[issue.type]}</Pill>
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
        <div><dt className="font-bold text-foreground">Category</dt><dd className="mt-1">{CUSTOMER_ISSUE_CATEGORY_LABELS[issue.category]}</dd></div>
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
  onClose,
  onStatus,
  updating,
}: {
  businessId: string;
  issueId: string | null;
  canUpdate: boolean;
  onClose: () => void;
  onStatus: (issueId: string, status: CustomerIssueStatus) => void;
  updating: boolean;
}) {
  const detail = useCustomerIssue(businessId, issueId);
  const issue = detail.data;
  return (
    <aside className={cn("fixed inset-y-0 right-0 z-40 w-full max-w-xl translate-x-full border-l bg-background shadow-2xl transition-transform duration-200 sm:top-16", issueId && "translate-x-0")} aria-label="Customer issue detail">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Customer issue</p>
            <h2 className="mt-1 text-lg font-bold">Issue details</h2>
          </div>
          <AppButton size="icon" variant="ghost" onClick={onClose} aria-label="Close issue detail"><X className="size-5" /></AppButton>
        </div>
        {detail.isPending ? (
          <div className="space-y-4 p-4"><LoadingCard /><LoadingCard /></div>
        ) : detail.isError ? (
          <div className="p-4"><AppErrorState title="Could not load issue" description={issueErrorMessage(detail.error)} onRetry={() => void detail.refetch()} /></div>
        ) : issue ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-wrap gap-2">
              <StatusPill status={issue.status} />
              <SeverityPill severity={issue.severity} />
              <Pill className="bg-muted text-muted-foreground">{CUSTOMER_ISSUE_CATEGORY_LABELS[issue.category]}</Pill>
            </div>
            <h3 className="mt-4 text-xl font-bold leading-7">{issue.summary}</h3>
            {issue.customerMessageExcerpt && (
              <blockquote className="mt-4 rounded-2xl border bg-card p-4 text-sm leading-6 text-muted-foreground">
                “{issue.customerMessageExcerpt}”
              </blockquote>
            )}
            <div className="mt-5 grid gap-3 text-sm">
              <DetailRow label="Customer" value={customerName(issue)} icon={UserRound} />
              <DetailRow label="Responsible staff" value={responsibleLabel(issue)} icon={CheckCircle2} />
              <DetailRow label="Client owner" value={issue.clientOwner?.name ?? "Not provided"} icon={UserRound} />
              <DetailRow label="Routing reason" value={issue.routingReason ?? "Not provided"} icon={AlertTriangle} />
              <DetailRow label="Created" value={formatCustomerIssueTime(issue.createdAt)} icon={Clock3} />
              <DetailRow label="Updated" value={formatCustomerIssueTime(issue.updatedAt)} icon={Clock3} />
              {issue.resolvedAt && <DetailRow label="Resolved" value={formatCustomerIssueTime(issue.resolvedAt)} icon={CheckCircle2} />}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {issue.conversationId && (
                <AppButton asChild variant="outline">
                  <Link href={`/conversations?conversationId=${issue.conversationId}`}>Open conversation <ExternalLink className="size-4" /></Link>
                </AppButton>
              )}
              {issue.leadId && (
                <AppButton asChild variant="outline">
                  <Link href={`/leads?lead=${issue.leadId}`}>Open lead <ExternalLink className="size-4" /></Link>
                </AppButton>
              )}
            </div>
            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-bold">Status actions</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {nextActions(issue.status, canUpdate).length ? nextActions(issue.status, canUpdate).map((action) => (
                  <AppButton key={action.status} size="sm" loading={updating} variant={action.status === "RESOLVED" ? "default" : "outline"} onClick={() => onStatus(issue.id, action.status)}>
                    {action.label}
                  </AppButton>
                )) : <p className="text-sm text-muted-foreground">No status actions are available for this issue.</p>}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock3 }) {
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
  const planCode = profile.data?.plan?.code;
  const billingAllowed = canManageBilling(profile.data);
  const canAccess = canAccessCustomerIssues(profile.data);
  const canUpdate = canUpdateCustomerIssueStatus(profile.data);
  const selectedIssueId = searchParams.get("issue");
  const issues = useCustomerIssues(activeBusinessId, requestQuery, Boolean(profile.data && canAccess && planCode !== "BASIC"));
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
      onError: (error) => systemNotify.error("Could not update issue", { description: issueErrorMessage(error) }),
      onSettled: () => setUpdatingIssueId(null),
    });
  };

  if (profile.isPending) return <main className="space-y-4 p-4 sm:p-6 lg:p-8"><LoadingCard className="min-h-40" /><LoadingCard className="min-h-80" /></main>;
  if (!activeBusinessId) return <AppErrorState title="No active business" description="Select a business before viewing customer issues." />;
  if (planCode === "BASIC") return <UpgradeState showBillingAction={billingAllowed} />;
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
        <div className="grid gap-3 md:grid-cols-3">
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

      {selectedIssueId && <div className="fixed inset-0 z-30 bg-foreground/10 backdrop-blur-[1px]" onClick={() => setParams({ issue: undefined })} />}
      <IssueDetailPanel
        businessId={activeBusinessId}
        issueId={selectedIssueId}
        canUpdate={canUpdate}
        updating={Boolean(selectedIssueId && updatingIssueId === selectedIssueId && updateStatus.isPending)}
        onClose={() => setParams({ issue: undefined })}
        onStatus={handleStatus}
      />
    </main>
  );
}
