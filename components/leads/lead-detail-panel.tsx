"use client";

import { CalendarDays, CheckCircle2, ChevronRight, Mail, MapPin, MessageSquareText, MoreHorizontal, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppButton } from "@/components/app-button";
import { AppErrorState } from "@/components/app-error-state";
import { APPOINTMENT_STATUS_LABELS } from "@/components/calendar/appointment-status-badge";
import { ConversationChannelBadge } from "@/components/conversations/conversation-channel-badge";
import { ConversationStatusBadge } from "@/components/conversations/conversation-status-badge";
import { DetailSidePanel } from "@/components/detail-side-panel";
import { FollowUpContextCard } from "@/components/follow-up/follow-up-context-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppointments } from "@/hooks/use-calendar-appointments";
import { useCurrentUser } from "@/hooks/use-auth";
import { useConversations } from "@/hooks/use-conversations";
import { useCustomerIssues } from "@/hooks/use-customer-issues";
import { useLead, useUpdateLeadStatus } from "@/hooks/use-leads";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { CUSTOMER_ISSUE_CATEGORY_LABELS, customerIssueStatusTone } from "@/lib/customer-issues";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/lib/leads";
import { systemNotify } from "@/lib/system-notifications";
import { cn } from "@/lib/utils";
import { getWorkspacePermissions } from "@/lib/workspace-permissions";
import type { CalendarAppointment } from "@/types/appointment";
import type { AppointmentStatus } from "@/types/appointment";
import type { Conversation } from "@/types/conversation";
import type { CustomerIssue } from "@/types/customer-issue";
import type { Lead, LeadActivity, LeadStatus } from "@/types/lead";
import { activityText, assigneeName, formatLeadDateTime, formatLeadShortDate, leadAppointmentPreview, leadInitials, leadLocation, leadReference, leadTitle, leadValue, latestConversation, openIssue } from "./details/lead-details-utils";

const stages: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "APPOINTMENT_SCHEDULED", "WON", "LOST"];
type PanelTab = "activity" | "appointments" | "conversation" | "complaints";

function LeadPanelSkeleton() {
  return (
    <div className="grid h-full grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6 border-r p-8">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <div className="space-y-6 p-8">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    </div>
  );
}

function SummaryLine({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-4 py-2.5">
      <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground"><Icon className="size-4" /></span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function CompactActivity({ activity }: { activity: LeadActivity }) {
  const copy = activityText(activity);
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_9rem] gap-4 py-5">
      <span className="mt-0.5 grid size-9 place-items-center rounded-full bg-secondary text-primary">
        {activity.action.includes("STATUS") ? <ChevronRight className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold">{copy.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{copy.description}</p>
      </div>
      <span className="pt-1 text-right text-[11px] text-muted-foreground">{formatLeadShortDate(activity.createdAt)}</span>
    </div>
  );
}

function StageRail({ leadId, status, canManage }: { leadId: string; status: LeadStatus; canManage: boolean }) {
  const updateStatus = useUpdateLeadStatus();
  const activeIndex = stages.indexOf(status);
  const update = (next: LeadStatus) => {
    if (!canManage || next === status) return;
    updateStatus.mutate(
      { id: leadId, status: next },
      {
        onSuccess: () => systemNotify.success("Lead stage updated"),
        onError: (error) => systemNotify.error("Could not update lead stage", { description: getApiErrorMessage(error) }),
      },
    );
  };

  return (
    <div className="px-8 pb-6 pt-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-xs font-semibold text-muted-foreground">Pipeline: <span className="font-bold text-foreground">Lead Progress</span> <span className="mx-1">|</span> Stage: <span className="font-bold text-foreground">{LEAD_STATUS_LABELS[status]}</span></p>
        <p className="text-[11px] text-muted-foreground">Updated recently</p>
      </div>
      <div className="flex overflow-hidden rounded-md border bg-muted/40">
        {stages.map((stage, index) => {
          const active = stage === status;
          const complete = activeIndex > index && status !== "LOST";
          return (
            <button
              key={stage}
              type="button"
              disabled={!canManage || updateStatus.isPending}
              onClick={() => update(stage)}
              className={cn(
                "relative min-h-8 flex-1 border-r px-3 text-[11px] font-black uppercase tracking-tight transition last:border-r-0",
                active && "bg-secondary text-primary",
                complete && "bg-primary/10 text-primary",
                !active && !complete && "bg-card text-muted-foreground hover:bg-muted",
                stage === "LOST" && active && "bg-destructive/10 text-destructive",
              )}
            >
              {LEAD_STATUS_LABELS[stage]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NextActionStrip({ appointment }: { appointment: CalendarAppointment | null }) {
  return (
    <div className="grid grid-cols-2 border-y bg-muted/10">
      <div className="border-r px-8 py-5">
        <p className="text-[11px] font-semibold text-muted-foreground">Active sequence</p>
        <p className="mt-0.5 text-sm font-bold">Lead follow-up</p>
        <Link href="/conversations" className="text-[11px] font-bold text-primary">Change</Link>
      </div>
      <div className="px-8 py-5">
        <p className="text-[11px] font-semibold text-muted-foreground">Next step</p>
        <p className="mt-0.5 text-sm font-bold">{appointment ? appointment.title : "Follow up with customer"}</p>
        <p className="text-[11px] text-muted-foreground">{appointment ? formatLeadDateTime(appointment.startTime) : "No date assigned"}</p>
      </div>
    </div>
  );
}

function appointmentStatusTextColor(status: AppointmentStatus) {
  if (status === "MISSED" || status === "NO_SHOW" || status === "CANCELLED") return "text-destructive";
  if (status === "COMPLETED" || status === "CONFIRMED") return "text-primary";
  if (status === "PENDING_BUSINESS_CONFIRMATION" || status === "NEEDS_HUMAN_CONFIRMATION" || status === "NEEDS_OUTCOME_CONFIRMATION") return "text-warning";
  return "text-info";
}

function AppointmentRow({ appointment }: { appointment: CalendarAppointment }) {
  return (
    <div className="grid grid-cols-[190px_minmax(0,1fr)_auto] rounded-xl border px-6 py-5">
      <div className="border-r pr-6">
        <p className="text-xs font-bold text-primary">{new Intl.DateTimeFormat("en-GH", { weekday: "long" }).format(new Date(appointment.startTime))}</p>
        <p className="mt-1 text-sm font-bold">{formatLeadShortDate(appointment.startTime)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-GH", { hour: "numeric", minute: "2-digit" }).format(new Date(appointment.startTime))} - {new Intl.DateTimeFormat("en-GH", { hour: "numeric", minute: "2-digit" }).format(new Date(appointment.endTime))}</p>
      </div>
      <div className="min-w-0 pl-6">
        <p className="truncate text-sm font-bold">{appointment.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{appointment.location ?? appointment.locationType.replaceAll("_", " ").toLowerCase()}</p>
        <p className="mt-1 text-xs text-muted-foreground">{appointment.assignedStaff?.name ?? "Unassigned"}</p>
      </div>
      <span className={cn("pt-0.5 text-right text-[11px] font-black", appointmentStatusTextColor(appointment.status))}>
        {APPOINTMENT_STATUS_LABELS[appointment.status]}
      </span>
    </div>
  );
}

function ConversationRow({ conversation }: { conversation: Conversation }) {
  return (
    <div className="rounded-xl border px-6 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{conversation.subject ?? conversation.displayId}</p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{conversation.lastMessagePreview ?? "No messages yet"}</p>
        </div>
        <div className="flex shrink-0 gap-1"><ConversationStatusBadge status={conversation.status} compact /><ConversationChannelBadge channel={conversation.channel} compact /></div>
      </div>
    </div>
  );
}

function ComplaintRow({ issue }: { issue: CustomerIssue }) {
  return (
    <div className="rounded-xl border px-6 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-bold">{issue.summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">{CUSTOMER_ISSUE_CATEGORY_LABELS[issue.category]} · {issue.responsibleMember?.name ?? "Unassigned"}</p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", customerIssueStatusTone(issue.status))}>{issue.status}</span>
      </div>
    </div>
  );
}

export function LeadDetailPanel({
  leadId,
  open,
  onOpenChange,
  fallbackLead,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackLead?: Lead | null;
}) {
  const profile = useCurrentUser();
  const activeBusinessId = profile.data?.activeBusiness?.id;
  const permissions = getWorkspacePermissions(profile.data);
  const detail = useLead(open ? leadId ?? "" : "");
  const conversations = useConversations({ page: 1, limit: 6, leadId: leadId ?? "__none__", sortBy: "lastMessageAt", sortOrder: "desc" }, Boolean(open && leadId));
  const appointments = useAppointments(activeBusinessId, { page: 1, limit: 8, leadId: leadId ?? "__none__" }, Boolean(open && leadId));
  const complaints = useCustomerIssues(activeBusinessId, { page: 1, limit: 6, leadId: leadId ?? "__none__" }, Boolean(open && leadId));
  const [tab, setTab] = useState<PanelTab>("activity");
  const canManageLead = permissions.canReassignLeadsToOthers;

  const lead = detail.data?.lead ?? fallbackLead;
  const activities = detail.data?.activities ?? [];
  const detailUnavailable = detail.isError && Boolean(fallbackLead);
  const previewAppointment = leadAppointmentPreview(appointments.data?.data ?? []);
  const latest = latestConversation(conversations.data?.data ?? []);
  const issue = openIssue(complaints.data?.data ?? []);
  const value = lead ? leadValue(lead) : null;
  const messageHref = latest ? `/conversations?conversationId=${latest.id}` : lead ? `/conversations?leadId=${lead.id}` : "/conversations";

  return (
    <DetailSidePanel
      open={open}
      onOpenChange={onOpenChange}
      width="min(1200px, calc(100vw - 2rem))"
      title={lead ? leadTitle(lead) : "Lead details"}
      description="Review lead details, progress, related records, and activity."
      className="sm:rounded-xl"
      contentClassName="lg:overflow-hidden"
      hideHeader
    >
      {detail.isPending && !fallbackLead ? <LeadPanelSkeleton /> : detail.isError && !fallbackLead ? (
        <div className="grid min-h-[58vh] place-items-center p-6">
          <AppErrorState
            title={detail.error instanceof ApiError && detail.error.code === "LEAD_NOT_FOUND" ? "Lead not found" : "Could not load lead"}
            description={getApiErrorMessage(detail.error)}
            onRetry={detail.error instanceof ApiError && ["LEAD_NOT_FOUND", "FORBIDDEN"].includes(detail.error.code) ? undefined : () => detail.refetch()}
          />
        </div>
      ) : lead ? (
        <div className="grid min-h-full grid-rows-[52px_minmax(0,1fr)] bg-card text-sm lg:h-full lg:min-h-0">
          <div className="flex items-center justify-between border-b px-8 text-xs text-muted-foreground">
            <span>2 of 7 in <span className="font-bold text-foreground">{LEAD_STATUS_LABELS[lead.status]}</span> stage</span>
            <button type="button" onClick={() => onOpenChange(false)} className="font-bold text-primary transition hover:text-primary/80">
              Close
            </button>
          </div>

          <div className="grid min-h-0 grid-cols-1 lg:h-full lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-h-0 border-b p-8 lg:h-full lg:overflow-hidden lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-black uppercase text-muted-foreground">{LEAD_SOURCE_LABELS[lead.source]}</span>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">{leadReference(lead)}</p>
                <h2 className="mt-1 font-display text-xl font-semibold leading-7">{leadTitle(lead)}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{leadLocation(lead) ?? "Location not provided"}</p>
                {detailUnavailable && (
                  <p className="mt-3 max-w-64 rounded-lg bg-warning/10 px-3 py-2 text-[11px] font-semibold leading-5 text-warning">
                    Full lead history is temporarily unavailable. Showing the lead record from the current list.
                  </p>
                )}
              </div>
              <AppButton size="icon" variant="outline" aria-label="More lead actions"><MoreHorizontal className="size-4" /></AppButton>
            </div>

            <div className="mt-7 grid grid-cols-[1fr_auto_auto] gap-3">
              <AppButton size="sm" asChild><Link href={messageHref}><MessageSquareText className="size-4" />Message</Link></AppButton>
              <AppButton size="icon" variant="outline" asChild><Link href={`/appointments/calendar?leadId=${lead.id}`} aria-label="Create appointment"><CalendarDays className="size-4" /></Link></AppButton>
              <AppButton size="icon" variant="outline" aria-label="More"><MoreHorizontal className="size-4" /></AppButton>
            </div>

            {value && (
              <div className="mt-8 rounded-xl bg-muted/60 px-5 py-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Estimated value</p>
                  <Link href={`/leads/${lead.id}/edit`} className="text-xs font-bold text-primary">View</Link>
                </div>
                <p className="mt-1 font-display text-xl font-semibold">{value}</p>
              </div>
            )}

            <div className="mt-9 border-t pt-7">
              <h3 className="text-xs font-black">Contact Details</h3>
              <div className="mt-5 space-y-1.5">
                <SummaryLine icon={UserRound} label="Customer" value={lead.fullName} />
                <SummaryLine icon={Mail} label="Email address" value={lead.email ?? "Not provided"} />
                <SummaryLine icon={Phone} label="Phone" value={lead.phone} />
                <SummaryLine icon={MapPin} label="Location" value={leadLocation(lead) ?? "Not provided"} />
              </div>
            </div>

            <div className="mt-9 border-t pt-7">
              <h3 className="text-xs font-black">Assigned staff</h3>
              <div className="mt-5 flex items-center gap-4">
                <span className="grid size-9 place-items-center rounded-full bg-secondary text-[11px] font-black text-primary">{leadInitials(assigneeName(lead))}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{assigneeName(lead)}</p>
                  <p className="text-[11px] text-muted-foreground">{lead.assignedStaff?.role.replaceAll("_", " ").toLowerCase() ?? "Unassigned"}</p>
                </div>
              </div>
            </div>

            <p className="mt-16 text-[11px] text-muted-foreground">Lead created {formatLeadDateTime(lead.createdAt)}</p>
          </aside>

          <section className="grid min-w-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] overflow-hidden">
            <StageRail leadId={lead.id} status={lead.status} canManage={canManageLead} />
            <NextActionStrip appointment={previewAppointment} />
            <div className="flex overflow-x-auto border-b px-8">
              {[
                ["activity", "Activity", activities.length],
                ["appointments", "Appointments", appointments.data?.data.length ?? 0],
                ["conversation", "Conversation", conversations.data?.data.length ?? 0],
                ["complaints", "Complaints", complaints.data?.data.length ?? 0],
              ].map(([key, label, count]) => (
                <button key={key} type="button" onClick={() => setTab(key as PanelTab)} className={cn("min-h-14 border-b-2 border-transparent px-5 text-sm font-bold text-muted-foreground", tab === key && "border-primary text-primary")}>
                  {label} {Number(count) > 0 && <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{count}</span>}
                </button>
              ))}
            </div>

            <div className="relative min-h-0">
              <div className="h-full overflow-y-auto p-8 pb-16">
                {tab === "activity" && (
                  <div>
                  <h3 className="mb-5 font-display text-base font-semibold">Latest Activity</h3>
                  <div className="mb-8">
                    <FollowUpContextCard businessId={activeBusinessId} leadId={lead.id} conversationId={latest?.id} canManage={canManageLead} />
                  </div>
                  <div className="divide-y">
                    {activities.length ? activities.slice(0, 5).map((activity) => <CompactActivity key={activity.id} activity={activity} />) : <p className="text-sm text-muted-foreground">No activity yet.</p>}
                  </div>

                  <div className="mt-9 flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold">Appointments</h3>
                    <Link href={`/appointments/calendar?leadId=${lead.id}`} className="text-xs font-bold text-primary">Create appointment</Link>
                  </div>
                  <div className="mt-4">
                    {previewAppointment ? <AppointmentRow appointment={previewAppointment} /> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No appointments connected to this lead.</p>}
                  </div>

                  {latest && (
                    <>
                      <h3 className="mt-9 font-display text-base font-semibold">Latest conversation</h3>
                      <div className="mt-4"><ConversationRow conversation={latest} /></div>
                    </>
                  )}
                  {issue && (
                    <>
                      <h3 className="mt-9 font-display text-base font-semibold">Open complaint</h3>
                      <div className="mt-4"><ComplaintRow issue={issue} /></div>
                    </>
                  )}
                  </div>
                )}

                {tab === "appointments" && (
                  <div className="space-y-3">
                  {appointments.data?.data.length ? appointments.data.data.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} />) : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No appointments connected to this lead.</p>}
                  </div>
                )}

                {tab === "conversation" && (
                  <div className="space-y-3">
                  {conversations.data?.data.length ? conversations.data.data.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} />) : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No conversations connected to this lead.</p>}
                  </div>
                )}

                {tab === "complaints" && (
                  <div className="space-y-3">
                  {complaints.data?.data.length ? complaints.data.data.map((item) => <ComplaintRow key={item.id} issue={item} />) : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No complaints recorded for this lead.</p>}
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card via-card/85 to-transparent" aria-hidden="true" />
            </div>
          </section>
          </div>
        </div>
      ) : null}
    </DetailSidePanel>
  );
}
