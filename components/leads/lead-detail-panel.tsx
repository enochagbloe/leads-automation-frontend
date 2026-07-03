"use client";

import {
  ArrowRight,
  AtSign,
  CheckCircle2,
  Clock3,
  History,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  UserRoundCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { systemNotify } from "@/lib/system-notifications";
import { DetailSidePanel } from "@/components/detail-side-panel";
import { AppButton } from "@/components/app-button";
import { AppSelect } from "@/components/app-select";
import { AppEmptyState } from "@/components/states/app-empty-state";
import { AppErrorState } from "@/components/states/app-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBusinessMembers } from "@/hooks/use-business-members";
import { useAssignLead, useLead, useUpdateLeadStatus } from "@/hooks/use-leads";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { formatLeadDate, getLeadActivityLabel, LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { getWorkspacePermissions } from "@/lib/workspace-permissions";
import type { Lead, LeadActivity, LeadStatus } from "@/types/lead";

const STATUS_PROGRESS: Record<LeadStatus, number> = {
  NEW: 10,
  CONTACTED: 25,
  INTERESTED: 40,
  QUALIFIED: 60,
  APPOINTMENT_SCHEDULED: 75,
  WON: 100,
  LOST: 0,
};

function initials(fullName: string) {
  return fullName.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function location(lead: Lead) {
  const value = lead.customFields?.location ?? lead.customFields?.preferredLocation ?? lead.customFields?.city;
  return typeof value === "string" && value.trim() ? value : "Not provided";
}

function owner(lead: Lead) {
  return lead.assignedStaff ? `${lead.assignedStaff.user.firstName} ${lead.assignedStaff.user.lastName}` : "Unassigned";
}

function createdByName(lead: Lead) {
  if (lead.createdBy) return `${lead.createdBy.firstName} ${lead.createdBy.lastName}`;
  if (lead.source === "WHATSAPP") return "WhatsApp inbound";
  if (lead.source === "WEBSITE") return "Website capture";
  return "System";
}

function activityDescription(activity: LeadActivity) {
  const actor = activity.actor ? `${activity.actor.firstName} ${activity.actor.lastName}` : "System";
  if (activity.action === "LEAD_STATUS_CHANGED" && typeof activity.metadata?.to === "string") {
    return `${actor} changed status to ${String(activity.metadata.to).replaceAll("_", " ").toLowerCase()}`;
  }
  if (activity.action === "LEAD_ASSIGNED") {
    const previousAssignee = activity.metadata?.previousAssignedStaffId ?? activity.metadata?.from;
    const newAssignee = activity.metadata?.newAssignedStaffId ?? activity.metadata?.to;
    if (newAssignee === null) return `${actor} cleared the lead assignment`;
    if (previousAssignee === null || previousAssignee === undefined) return `${actor} assigned the lead`;
    return `${actor} reassigned the lead`;
  }
  if (activity.action === "LEAD_NOTE_UPDATED") return `${actor} updated the lead notes`;
  return `${actor} ${getLeadActivityLabel(activity.action).toLowerCase()}`;
}

function LeadPanelSkeleton() {
  return (
    <div className="space-y-8 p-5 sm:p-6" aria-label="Loading lead detail">
      <div className="flex gap-4"><Skeleton className="size-14 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-2/5" /><Skeleton className="h-4 w-3/5" /></div></div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20" />)}</div>
      <Skeleton className="h-28" />
      <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16" />)}</div>
    </div>
  );
}

function PanelMetaRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[1rem_minmax(7rem,0.42fr)_minmax(0,1fr)] items-center gap-3">
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-card p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-semibold">{value}</dd>
    </div>
  );
}

function ActivityTimeline({ activities }: { activities: LeadActivity[] }) {
  if (!activities.length) return <AppEmptyState className="min-h-44 border-0 p-5" icon={History} title="No activity yet" description="Lead activity will appear here as your team works the opportunity." />;
  return (
    <ol className="space-y-0">
      {activities.slice(0, 6).map((activity) => (
        <li key={activity.id} className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 pb-6 last:pb-0">
          <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border last:hidden" />
          <span className={cn("relative z-10 grid size-8 place-items-center rounded-full border bg-card text-primary", activity.action === "LEAD_STATUS_CHANGED" && "bg-secondary")}>
            {activity.action === "LEAD_STATUS_CHANGED" ? <RefreshCw className="size-3.5" /> : activity.action === "LEAD_NOTE_UPDATED" ? <NotebookPen className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold leading-5">{activityDescription(activity)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatLeadDate(activity.createdAt)}</span>
              {activity.action === "LEAD_STATUS_CHANGED" && typeof activity.metadata?.to === "string" && <LeadStatusBadge status={activity.metadata.to as LeadStatus} />}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function LeadDetailPanel({ leadId, open, onOpenChange }: { leadId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const detail = useLead(open ? leadId ?? "" : "");
  const profile = useCurrentUser();
  const updateStatus = useUpdateLeadStatus();
  const assignLead = useAssignLead();
  const canManage = getWorkspacePermissions(profile.data).canReassignLeadsToOthers;
  const members = useBusinessMembers(profile.data?.activeBusiness?.id, canManage);
  const placeholder = (label: string) => systemNotify.info(`${label} is coming soon`);
  const [activeTab, setActiveTab] = useState<"activity" | "notes" | "assignment" | "details">("activity");
  const lead = detail.data?.lead;
  const assignableMembers = (members.data ?? []).filter((member) => member.status === "ACTIVE" && member.canReceiveAssignedWork);
  const assigneeOptions = lead ? [
    { value: "__unassigned", label: "Unassigned" },
    ...assignableMembers.map((member) => ({
      value: member.membershipId || member.id,
      label: `${member.user.firstName} ${member.user.lastName}`,
      description: [member.positionTitle, member.user.email].filter(Boolean).join(" · "),
    })),
    ...(lead.assignedStaff && !assignableMembers.some((member) => (member.membershipId || member.id) === lead.assignedStaff?.id)
      ? [{ value: lead.assignedStaff.id, label: `${lead.assignedStaff.user.firstName} ${lead.assignedStaff.user.lastName}`, description: lead.assignedStaff.user.email }]
      : []),
  ] : [];

  return (
    <DetailSidePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Lead Detail"
      actionLabel="Edit lead"
      onActionClick={() => leadId && router.push(`/leads/${leadId}/edit`)}
    >
      {detail.isPending ? <LeadPanelSkeleton /> : detail.isError ? (
        <div className="p-5 sm:p-6">
          <AppErrorState
            className="min-h-[55vh] border-0"
            title={detail.error instanceof ApiError && detail.error.code === "LEAD_NOT_FOUND" ? "Lead not found" : detail.error instanceof ApiError && detail.error.code === "FORBIDDEN" ? "Access denied" : "Could not load lead"}
            description={detail.error instanceof ApiError && detail.error.code === "LEAD_NOT_FOUND" ? "This lead is unavailable in the active business." : getApiErrorMessage(detail.error)}
            onRetry={detail.error instanceof ApiError && ["LEAD_NOT_FOUND", "FORBIDDEN"].includes(detail.error.code) ? undefined : () => detail.refetch()}
          />
        </div>
      ) : detail.data ? (
        <div className="min-h-0">
          <section className="px-5 pb-5 pt-5 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Lead profile</p>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold leading-8 tracking-tight">{detail.data.lead.fullName}</h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">{detail.data.lead.email ?? detail.data.lead.phone}</p>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">{initials(detail.data.lead.fullName)}</span>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <PanelMetaRow icon={Clock3} label="Created time" value={formatLeadDate(detail.data.lead.createdAt)} />
              <PanelMetaRow icon={CheckCircle2} label="Status" value={<LeadStatusBadge status={detail.data.lead.status} />} />
              <PanelMetaRow icon={AtSign} label="Source" value={LEAD_SOURCE_LABELS[detail.data.lead.source]} />
              <PanelMetaRow icon={UserRoundCheck} label="Lead owner" value={owner(detail.data.lead)} />
              <PanelMetaRow icon={MapPin} label="Location" value={location(detail.data.lead)} />
              <PanelMetaRow icon={Clock3} label="Last updated" value={formatLeadDate(detail.data.lead.updatedAt)} />
            </div>

            <div className="mt-6 rounded-2xl bg-muted/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold">Lead progress</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{LEAD_STATUS_LABELS[detail.data.lead.status]} stage</p>
                </div>
                <p className="text-sm font-bold tabular-nums">{STATUS_PROGRESS[detail.data.lead.status]}%</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-background" role="progressbar" aria-label="Lead progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={STATUS_PROGRESS[detail.data.lead.status]}>
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${STATUS_PROGRESS[detail.data.lead.status]}%` }} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <AppButton size="sm" variant="outline" onClick={() => placeholder("Messaging")}><MessageSquare className="size-4" />Message</AppButton>
              {detail.data.lead.email && <AppButton size="sm" variant="outline" asChild><a href={`mailto:${detail.data.lead.email}`}><Mail className="size-4" />Email</a></AppButton>}
              <AppButton size="sm" variant="outline" asChild><a href={`tel:${detail.data.lead.phone}`}><Phone className="size-4" />Call</a></AppButton>
              <AppButton size="sm" variant="outline" onClick={() => placeholder("More actions")}><MoreHorizontal className="size-4" />More</AppButton>
            </div>
          </section>

          <nav className="sticky top-0 z-10 flex overflow-x-auto border-y bg-card/95 px-5 backdrop-blur sm:px-6" aria-label="Lead detail tabs">
            {[
              ["activity", `Activity ${detail.data.activities.length}`],
              ["notes", `Notes ${detail.data.lead.notes ? 1 : 0}`],
              ["assignment", "Assignment"],
              ["details", "Details"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={cn("min-h-12 shrink-0 border-b-2 border-transparent px-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground", activeTab === key && "border-primary text-primary")}
              >
                {label}
              </button>
            ))}
          </nav>

          <section className="px-5 py-5 sm:px-6">
            {activeTab === "activity" && (
              <div>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h3 className="font-bold">Latest activity</h3>
                  <AppButton size="sm" variant="ghost" onClick={() => placeholder("Full activity history")}>View all <ArrowRight className="size-4" /></AppButton>
                </div>
                <ActivityTimeline activities={detail.data.activities} />
              </div>
            )}

            {activeTab === "notes" && (
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-bold">Notes</h3>
                  <AppButton size="sm" variant="ghost" onClick={() => placeholder("Add note")}><Plus className="size-4" />Add note</AppButton>
                </div>
                {detail.data.lead.notes ? (
                  <article className="rounded-2xl bg-muted/55 p-4">
                    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Lead note</p><p className="text-xs text-muted-foreground">{formatLeadDate(detail.data.lead.updatedAt)}</p></div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{detail.data.lead.notes}</p>
                  </article>
                ) : <AppEmptyState className="min-h-40 border-0" icon={NotebookPen} title="No notes yet" description="Add a note to preserve important context for the team." actionLabel="Add note" onAction={() => placeholder("Add note")} />}
              </div>
            )}

            {activeTab === "assignment" && (
              <div className="grid gap-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="panel-lead-status">Lead status</label>
                  <AppSelect
                    id="panel-lead-status"
                    value={detail.data.lead.status}
                    options={LEAD_STATUSES.map((status) => ({ value: status, label: LEAD_STATUS_LABELS[status] }))}
                    disabled={updateStatus.isPending}
                    onValueChange={(status) => updateStatus.mutate(
                      { id: detail.data.lead.id, status: status as LeadStatus },
                      { onSuccess: () => systemNotify.success("Status updated"), onError: (error) => systemNotify.error("Could not update status", { description: getApiErrorMessage(error) }) },
                    )}
                  />
                </div>
                {canManage ? (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold" htmlFor="panel-lead-assignee">Assigned staff</label>
                    <AppSelect
                      id="panel-lead-assignee"
                      value={detail.data.lead.assignedStaffId ?? "__unassigned"}
                      options={assigneeOptions}
                      disabled={assignLead.isPending || members.isPending}
                      onValueChange={(assignedStaffId) => assignLead.mutate(
                        { id: detail.data.lead.id, assignedStaffId: assignedStaffId === "__unassigned" ? null : assignedStaffId },
                        {
                          onSuccess: () => systemNotify.success("Assignment updated"),
                          onError: (error) => {
                            if (error instanceof ApiError && error.code === "INVALID_LEAD_ASSIGNEE") void detail.refetch();
                            systemNotify.error("Could not update assignment", { description: getApiErrorMessage(error) });
                          },
                        },
                      )}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl bg-muted/55 p-4">
                    <p className="text-sm font-bold">Assigned staff</p>
                    <p className="mt-1 text-sm text-muted-foreground">{owner(detail.data.lead)}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "details" && (
              <div className="grid gap-5">
                <dl className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2">
                  <DetailCell label="Phone" value={detail.data.lead.phone} />
                  <DetailCell label="Email" value={detail.data.lead.email ?? "No email provided"} />
                  <DetailCell label="Source" value={LEAD_SOURCE_LABELS[detail.data.lead.source]} />
                  <DetailCell label="Location" value={location(detail.data.lead)} />
                  <DetailCell label="Created by" value={createdByName(detail.data.lead)} />
                  <DetailCell label="Last contacted" value={detail.data.lead.lastContactedAt ? formatLeadDate(detail.data.lead.lastContactedAt) : "Not contacted yet"} />
                </dl>
                {detail.data.lead.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold">Tags</h3>
                    <div className="mt-3 flex flex-wrap gap-2">{detail.data.lead.tags.map((tag) => <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-primary">{tag}</span>)}</div>
                  </div>
                )}
                {detail.data.lead.customFields && Object.keys(detail.data.lead.customFields).length > 0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="font-bold">Additional details</h3>
                      <AppButton size="sm" variant="ghost" onClick={() => router.push(`/leads/${detail.data.lead.id}/edit`)}><Pencil className="size-4" />Edit</AppButton>
                    </div>
                    <dl className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2">
                      {Object.entries(detail.data.lead.customFields).map(([key, value]) => (
                        <DetailCell key={key} label={key.replaceAll("_", " ")} value={typeof value === "string" ? value : JSON.stringify(value)} />
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </DetailSidePanel>
  );
}
