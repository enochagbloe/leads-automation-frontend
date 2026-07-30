"use client";

import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Send, XCircle } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCancelFollowUpJob, useFollowUpContextJobs, useFollowUpContextLogs, useRetryFollowUpJob } from "@/hooks/use-follow-up";
import { getApiErrorMessage } from "@/lib/api-client";
import { systemNotify } from "@/lib/system-notifications";
import { cn } from "@/lib/utils";
import type { FollowUpJob, FollowUpJobStatus, FollowUpLog } from "@/types/follow-up";

type FollowUpContextCardProps = {
  businessId?: string | null;
  leadId?: string | null;
  conversationId?: string | null;
  appointmentId?: string | null;
  compact?: boolean;
  canManage?: boolean;
};

const activeStatuses = new Set(["SCHEDULED", "PROCESSING"]);

function formatFollowUpTime(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusTone(status?: FollowUpJobStatus | string | null) {
  if (status === "SCHEDULED") return "text-primary";
  if (status === "PROCESSING") return "text-info";
  if (status === "SENT") return "text-primary";
  if (status === "FAILED") return "text-destructive";
  if (status === "CANCELLED" || status === "SKIPPED") return "text-muted-foreground";
  return "text-muted-foreground";
}

function StatusIcon({ status }: { status?: FollowUpJobStatus | string | null }) {
  if (status === "FAILED") return <AlertTriangle className="size-3.5" />;
  if (status === "CANCELLED" || status === "SKIPPED") return <XCircle className="size-3.5" />;
  if (status === "SENT") return <CheckCircle2 className="size-3.5" />;
  if (status === "PROCESSING") return <RefreshCw className="size-3.5" />;
  return <Clock3 className="size-3.5" />;
}

function jobDescription(job?: FollowUpJob) {
  if (!job) return "No active follow-up is currently scheduled for this record.";
  if (job.status === "SCHEDULED") return `Next send: ${formatFollowUpTime(job.scheduledFor)}`;
  if (job.status === "PROCESSING") return "Follow-up is currently being prepared.";
  if (job.status === "FAILED") return job.failureReason ?? "The last follow-up attempt failed.";
  if (job.status === "CANCELLED") return job.cancelReason ?? "Follow-up was cancelled.";
  if (job.status === "SENT") return `Sent ${formatFollowUpTime(job.sentAt ?? job.updatedAt)}`;
  return job.pendingQuestion ?? "Follow-up state is available from the backend.";
}

function lastLogDescription(log?: FollowUpLog) {
  if (!log) return "No follow-up message has been recorded yet.";
  return log.messagePreview ?? `${log.deliveryStatus ?? "Follow-up"} recorded ${formatFollowUpTime(log.sentAt ?? log.createdAt)}`;
}

export function FollowUpContextCard({ businessId, leadId, conversationId, appointmentId, compact = false, canManage = false }: FollowUpContextCardProps) {
  const context = { leadId, conversationId, appointmentId, limit: compact ? 3 : 5 };
  const jobs = useFollowUpContextJobs(businessId, context);
  const logs = useFollowUpContextLogs(businessId, context);
  const cancelJob = useCancelFollowUpJob(businessId);
  const retryJob = useRetryFollowUpJob(businessId);

  const jobList = jobs.data?.data ?? [];
  const logList = logs.data?.data ?? [];
  const activeJob = jobList.find((job) => activeStatuses.has(job.status)) ?? jobList[0];
  const latestLog = logList[0];
  const attempts = activeJob?.rule?.maxSendsPerConversation ?? activeJob?.rule?.maxSendsPerLead;

  const onCancel = () => {
    if (!activeJob) return;
    cancelJob.mutate(
      { jobId: activeJob.id, reason: "Cancelled from frontend context panel." },
      {
        onSuccess: () => systemNotify.success("Follow-up cancelled"),
        onError: (error) => systemNotify.error("Could not cancel follow-up", { description: getApiErrorMessage(error) }),
      },
    );
  };

  const onRetry = () => {
    if (!activeJob) return;
    retryJob.mutate(activeJob.id, {
      onSuccess: () => systemNotify.success("Follow-up retry scheduled"),
      onError: (error) => systemNotify.error("Could not retry follow-up", { description: getApiErrorMessage(error) }),
    });
  };

  if (!businessId || (!leadId && !conversationId && !appointmentId)) return null;

  if (jobs.isPending || logs.isPending) {
    return (
      <section className={cn("rounded-xl border bg-card p-4", compact && "p-3")}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-12 rounded-lg" />
        <Skeleton className="mt-3 h-8 rounded-lg" />
      </section>
    );
  }

  if (jobs.isError || logs.isError) {
    return (
      <section className={cn("rounded-xl border bg-card p-4", compact && "p-3")}>
        <p className="text-sm font-bold">Follow-up automation</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">Could not load follow-up context for this record.</p>
      </section>
    );
  }

  return (
    <section className={cn("rounded-xl border bg-card p-4", compact && "p-3")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">Follow-up automation</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Customer follow-up state for this record.</p>
        </div>
        <span className={cn("inline-flex items-center gap-1 text-xs font-black", statusTone(activeJob?.status))}>
          <StatusIcon status={activeJob?.status} />
          {activeJob?.status ? activeJob.status.replaceAll("_", " ").toLowerCase() : "idle"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-xs">
        <div className="rounded-lg bg-muted/45 p-3">
          <p className="font-bold text-foreground">{activeJob?.rule?.name ?? "No active sequence"}</p>
          <p className="mt-1 leading-5 text-muted-foreground">{jobDescription(activeJob)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted-foreground">Attempts</p>
            <p className="mt-0.5 font-bold">{attempts ? `${attempts} max` : "Backend default"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last message</p>
            <p className="mt-0.5 line-clamp-1 font-bold">{latestLog?.deliveryStatus ?? "None"}</p>
          </div>
        </div>
        <p className="line-clamp-2 leading-5 text-muted-foreground"><Send className="mr-1 inline size-3.5" />{lastLogDescription(latestLog)}</p>
      </div>

      {canManage && activeJob && (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeJob.status === "FAILED" && <AppButton size="sm" variant="outline" loading={retryJob.isPending} onClick={onRetry}>Retry</AppButton>}
          {activeStatuses.has(activeJob.status) && <AppButton size="sm" variant="outline" loading={cancelJob.isPending} onClick={onCancel}>Cancel follow-up</AppButton>}
        </div>
      )}
    </section>
  );
}
