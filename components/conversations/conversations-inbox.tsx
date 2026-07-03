"use client";

import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  LockKeyhole,
  MessageCircleMore,
  MessageSquarePlus,
  Pin,
  RefreshCw,
  Search,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { systemNotify } from "@/lib/system-notifications";
import { AppButton } from "@/components/app-button";
import { AppIsoDatePicker, parseDateValue } from "@/components/app-date-picker";
import { AppEmptyState } from "@/components/app-empty-state";
import { AppErrorState } from "@/components/app-error-state";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { ConversationChannelBadge } from "@/components/conversations/conversation-channel-badge";
import { ConversationStatusBadge } from "@/components/conversations/conversation-status-badge";
import { ConversationWorkspace } from "@/components/conversations/conversation-workspace";
import { CreateConversationDialog } from "@/components/conversations/create-conversation-dialog";
import { RealtimeStatusIndicator } from "@/components/conversations/realtime-status-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBusinessSetupStatus } from "@/hooks/use-business-setup";
import {
  useAssignConversation,
  useClaimConversation,
  useConversation,
  useConversations,
  useConversationStats,
  useDeleteConversation,
  useEndConversation,
  useMarkConversationRead,
  useRetryConversationMessage,
  useSendConversationMessage,
  useUpdateConversation,
  useUpdateConversationStatus,
} from "@/hooks/use-conversations";
import { useLead, useUpdateLead } from "@/hooks/use-leads";
import { useSendKnowledgeAsset } from "@/hooks/use-knowledge";
import { useWhatsAppStatus } from "@/hooks/use-whatsapp";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import {
  CONVERSATION_CHANNEL_LABELS,
  CONVERSATION_CHANNELS,
  CONVERSATION_PRIORITIES,
  CONVERSATION_PRIORITY_LABELS,
  CONVERSATION_STATUS_LABELS,
  CONVERSATION_STATUSES,
  formatConversationTime,
} from "@/lib/conversations";
import { cn } from "@/lib/utils";
import { canAccessOperationalPage, getWorkspacePermissions } from "@/lib/workspace-permissions";
import type { Conversation, ConversationListQuery, ConversationStatus, UpdateConversationInput } from "@/types/conversation";
import type { StagedKnowledgeAsset } from "@/components/knowledge/conversation-knowledge-drawer";

function parseQuery(params: URLSearchParams): ConversationListQuery {
  return {
    page: Math.max(1, Number(params.get("page")) || 1),
    limit: Math.min(100, Math.max(1, Number(params.get("limit")) || 20)),
    search: params.get("search") || undefined,
    status: (params.get("status") || undefined) as ConversationListQuery["status"],
    channel: (params.get("channel") || undefined) as ConversationListQuery["channel"],
    assignedStaffId: params.get("assignedStaffId") || undefined,
    priority: (params.get("priority") || undefined) as ConversationListQuery["priority"],
    pinned: params.get("pinned") === "true" ? true : undefined,
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    sortBy: "lastMessageAt",
    sortOrder: "desc",
  };
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function assigneeName(conversation: Conversation) {
  return conversation.assignedStaff ? `${conversation.assignedStaff.user.firstName} ${conversation.assignedStaff.user.lastName}` : "Unassigned";
}

function conversationActionError(error: unknown) {
  if (!(error instanceof ApiError)) return getApiErrorMessage(error);
  const messages: Record<string, string> = {
    PLAN_LIMIT_REACHED: "This customer message is locked because the conversation limit has been reached.",
    CONVERSATION_ACCESS_BLOCKED: "This conversation is locked by plan or billing status.",
    PAYMENT_REQUIRED: "Restore payment to unlock this conversation.",
    SUBSCRIPTION_INACTIVE: "Reactivate the subscription to unlock this conversation.",
    CONVERSATION_CLOSED: "This conversation is closed. It will reopen automatically when new message activity happens.",
    REOPEN_REQUIRES_MESSAGE_ACTIVITY: "This conversation can only reopen when a new message is received.",
    FORBIDDEN: "You do not have permission to perform this action.",
  };
  return messages[error.code] ?? error.message;
}

function ConversationListSkeleton() {
  return <div className="space-y-2 p-3">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="flex gap-3 rounded-xl border bg-card p-4"><Skeleton className="size-11 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/3" /></div></div>)}</div>;
}

function ConversationListItem({ conversation, canClaim, claimBusy, onClaim, onSelect }: { conversation: Conversation; canClaim?: boolean; claimBusy?: boolean; onClaim?: () => void; onSelect: () => void }) {
  const locked = conversation.status === "PLAN_LIMIT_BLOCKED" || conversation.accessBlocked;
  const closed = conversation.status === "CLOSED";
  const canOpen = !locked || conversation.permissions?.canViewMessages !== false;
  const canClaimThis = !locked && !closed && !conversation.assignedStaffId && canClaim && conversation.permissions?.canClaim !== false;
  return (
    <article className={cn("group flex min-h-28 w-full gap-3 rounded-xl border bg-card p-4 text-left transition-[border-color,box-shadow,background-color] hover:border-primary/25 hover:bg-secondary/20 hover:shadow-[0_8px_24px_rgba(20,35,27,0.06)]", locked && "border-dashed bg-muted/35 hover:bg-muted/45")}>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-xs font-bold", conversation.unreadCount > 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-primary", locked && "bg-muted text-muted-foreground")}>{locked ? <LockKeyhole className="size-4" /> : initials(conversation.lead.fullName)}</span>
      <span className="min-w-0 flex-1">
        <button type="button" onClick={canOpen ? onSelect : undefined} disabled={!canOpen} className="flex w-full items-start justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"><span className={cn("flex min-w-0 items-center gap-1 truncate text-sm", conversation.unreadCount > 0 ? "font-bold" : "font-semibold")}>{conversation.pinned && <Pin className="size-3 shrink-0 fill-current text-primary" />}<span className="truncate">{conversation.lead.fullName}</span></span><span className="shrink-0 text-[10px] font-medium text-muted-foreground">{formatConversationTime(conversation.lastMessageAt ?? conversation.updatedAt)}</span></button>
        <span className="mt-1 block truncate text-[11px] font-medium text-muted-foreground">{conversation.lead.phone}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{locked && conversation.permissions?.canViewMessages === false ? "Message body locked by plan or billing status" : conversation.lastMessagePreview ?? conversation.subject ?? "No messages yet"}</span>
        <span className="mt-3 flex flex-wrap items-center gap-2"><ConversationStatusBadge status={conversation.status} compact /><ConversationChannelBadge channel={conversation.channel} compact /><span className="min-w-0 flex-1 truncate text-[10px] font-medium text-muted-foreground">{conversation.displayId} · {assigneeName(conversation)}</span>{conversation.unreadCount > 0 && <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">{conversation.unreadCount}</span>}</span>
        {!canOpen && <p className="mt-3 text-xs font-semibold text-muted-foreground">Locked preview. Restore billing or wait for quota reset to open.</p>}
        {canClaimThis && (
          <button
            type="button"
            aria-label={`Take conversation ${conversation.displayId}`}
            onClick={onClaim}
            disabled={claimBusy}
            className={cn("mt-3 inline-flex min-h-8 items-center rounded-lg bg-secondary px-2.5 text-xs font-bold text-primary transition hover:bg-secondary/80", claimBusy && "pointer-events-none opacity-60")}
          >
            {claimBusy ? "Taking..." : "Take conversation"}
          </button>
        )}
      </span>
    </article>
  );
}

function InboxList({
  query,
  onParams,
  onCreate,
  onSelect,
  activeBusinessId,
  currentMembershipId,
  canCreate,
  canClaim,
  staffView,
}: {
  query: ConversationListQuery;
  onParams: (updates: Record<string, string | number | undefined>) => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
  activeBusinessId?: string | null;
  currentMembershipId?: string;
  canCreate: boolean;
  canClaim: boolean;
  staffView: boolean;
}) {
  const conversations = useConversations(query);
  const stats = useConversationStats();
  const claim = useClaimConversation(activeBusinessId);
  const dateFrom = parseDateValue(query.dateFrom);
  const dateTo = parseDateValue(query.dateTo);
  const claimError = (error: unknown) => {
    const description = error instanceof ApiError && error.code === "WORK_ALREADY_ASSIGNED"
      ? "This conversation is already assigned to another team member."
      : getApiErrorMessage(error);
    systemNotify.error("Could not take conversation", { description });
    void conversations.refetch();
  };

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-background px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><div className="flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Communication center</p><RealtimeStatusIndicator /></div><h1 className="mt-1 text-2xl font-bold">Inbox</h1><p className="mt-1 text-sm text-muted-foreground">Review stored customer conversations and team follow-up.</p></div>
          {canCreate && <AppButton onClick={onCreate}><MessageSquarePlus className="size-4" />New conversation</AppButton>}
        </header>
        {((stats.data?.locked ?? 0) > 0 || conversations.data?.data.some((conversation) => conversation.status === "PLAN_LIMIT_BLOCKED" || conversation.accessBlocked)) && (
          <div className="mt-5 rounded-2xl border border-warning/25 bg-warning/10 p-4 text-sm text-warning">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Locked customer messages need attention</p>
                <p className="mt-1 text-xs leading-5">You have locked customer messages because your conversation limit has been reached or billing is inactive.</p>
              </div>
              <AppButton asChild size="sm" variant="outline"><a href="/settings/billing">View Billing</a></AppButton>
            </div>
          </div>
        )}

        <section className="mt-6 rounded-2xl border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Search conversations</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><AppInput className="pl-9" placeholder="Search conversations" value={query.search ?? ""} onChange={(event) => onParams({ search: event.target.value || undefined, page: 1 })} /></label>
            <div className="grid grid-cols-2 gap-2 lg:w-[860px] lg:grid-cols-5">
              <AppSelect aria-label="Filter conversation status" value={query.status ?? "ALL"} options={[{ value: "ALL", label: "All statuses" }, ...CONVERSATION_STATUSES.map((status) => ({ value: status, label: CONVERSATION_STATUS_LABELS[status] }))]} onValueChange={(value) => onParams({ status: value === "ALL" ? undefined : value, page: 1 })} />
              <AppSelect aria-label="Filter conversation channel" value={query.channel ?? "ALL"} options={[{ value: "ALL", label: "All channels" }, ...CONVERSATION_CHANNELS.map((channel) => ({ value: channel, label: CONVERSATION_CHANNEL_LABELS[channel] }))]} onValueChange={(value) => onParams({ channel: value === "ALL" ? undefined : value, page: 1 })} />
              <AppSelect aria-label="Filter conversation priority" value={query.priority ?? "ALL"} options={[{ value: "ALL", label: "All priorities" }, ...CONVERSATION_PRIORITIES.map((priority) => ({ value: priority, label: CONVERSATION_PRIORITY_LABELS[priority] }))]} onValueChange={(value) => onParams({ priority: value === "ALL" ? undefined : value, page: 1 })} />
              <AppIsoDatePicker aria-label="Filter conversations created from date" value={query.dateFrom} onChange={(value) => onParams({ dateFrom: value || undefined, page: 1 })} placeholder="Created from" disabledDates={dateTo ? { after: dateTo } : undefined} />
              <AppIsoDatePicker aria-label="Filter conversations created to date" value={query.dateTo} onChange={(value) => onParams({ dateTo: value || undefined, page: 1 })} placeholder="Created to" disabledDates={dateFrom ? { before: dateFrom } : undefined} />
            </div>
            <AppButton variant={query.pinned ? "secondary" : "outline"} aria-pressed={Boolean(query.pinned)} onClick={() => onParams({ pinned: query.pinned ? undefined : "true", page: 1 })}><Pin className="size-4" />Pinned</AppButton>
            <AppButton size="icon" variant="outline" aria-label="Refresh inbox" onClick={() => Promise.all([conversations.refetch(), stats.refetch()])}><RefreshCw className="size-4" /></AppButton>
          </div>

          {staffView && (
            <div className="flex gap-1 overflow-x-auto border-b px-4 py-2">
              {[
                { label: "Available", value: undefined },
                { label: "Assigned to me", value: currentMembershipId },
                { label: "Unassigned", value: "unassigned" },
                { label: "Needs review", value: "unassigned", status: "NEEDS_HUMAN_REVIEW" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onParams({ assignedStaffId: item.value, status: item.status as ConversationStatus | undefined, page: 1 })}
                  disabled={item.label === "Assigned to me" && !currentMembershipId}
                  className={cn(
                    "min-h-9 shrink-0 rounded-lg px-3 text-xs font-bold text-muted-foreground transition hover:bg-secondary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    query.assignedStaffId === item.value && query.status === item.status && "bg-secondary text-primary",
                    !query.assignedStaffId && !query.status && item.value === undefined && !item.status && "bg-secondary text-primary",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1 overflow-x-auto border-b px-4 pt-2">
            {[
              { status: undefined, label: "All", count: stats.data?.total ?? 0 },
              { status: "OPEN" as const, label: "Open", count: stats.data?.open ?? 0 },
              { status: "HUMAN_HANDLING" as const, label: "Human handling", count: stats.data?.humanHandling ?? 0 },
              { status: "AI_HANDLING" as const, label: "AI handling", count: stats.data?.aiHandling ?? 0 },
              { status: "NEEDS_HUMAN_REVIEW" as const, label: "Needs review", count: stats.data?.needsHumanReview ?? 0 },
              { status: "CLOSED" as const, label: "Closed", count: stats.data?.closed ?? 0 },
              { status: "PLAN_LIMIT_BLOCKED" as const, label: "Locked", count: stats.data?.locked ?? 0 },
            ].map((item) => <button key={item.label} type="button" onClick={() => onParams({ status: item.status, page: 1 })} className={cn("relative min-h-11 shrink-0 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", query.status === item.status && "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary")}>{item.label} <span className="ml-1 tabular-nums opacity-65">{item.count}</span></button>)}
          </div>

          {conversations.isPending
            ? <ConversationListSkeleton />
            : conversations.isError
              ? <AppErrorState className="m-4 min-h-64 border-0" title="Could not load inbox" description={getApiErrorMessage(conversations.error)} onRetry={() => conversations.refetch()} />
              : conversations.data.data.length === 0
                ? <AppEmptyState className="m-4 min-h-72 border-0" icon={Inbox} title={staffView ? "No available conversations" : "No conversations yet"} description={staffView ? "Assigned and unassigned conversations available to you will appear here." : "Start a manual conversation with an existing lead."} actionLabel={canCreate ? "New conversation" : undefined} onAction={onCreate} />
                : <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{conversations.data.data.map((conversation) => (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    canClaim={canClaim}
                    claimBusy={claim.isPending && claim.variables === conversation.id}
                    onClaim={() => claim.mutate(conversation.id, { onSuccess: () => systemNotify.success("Conversation assigned to you"), onError: claimError })}
                    onSelect={() => onSelect(conversation.id)}
                  />
                ))}</div>}

          {conversations.data && conversations.data.pagination.totalPages > 1 && <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground"><span>Page {conversations.data.pagination.page} of {conversations.data.pagination.totalPages}</span><div className="flex gap-1"><AppButton size="icon" variant="ghost" disabled={query.page <= 1} aria-label="Previous page" onClick={() => onParams({ page: query.page - 1 })}><ChevronLeft className="size-4" /></AppButton><AppButton size="icon" variant="ghost" disabled={query.page >= conversations.data.pagination.totalPages} aria-label="Next page" onClick={() => onParams({ page: query.page + 1 })}><ChevronRight className="size-4" /></AppButton></div></div>}
        </section>
      </div>
    </main>
  );
}

export function ConversationsInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = parseQuery(searchParams);
  const profile = useCurrentUser();
  const permissions = getWorkspacePermissions(profile.data);
  const canViewConversations = canAccessOperationalPage(profile.data, "conversations");
  const selectedId = canViewConversations ? searchParams.get("conversationId") ?? searchParams.get("conversation") ?? "" : "";
  const conversations = useConversations(query, Boolean(profile.data && canViewConversations));
  const detail = useConversation(selectedId);
  const businessSetup = useBusinessSetupStatus(profile.data?.activeBusiness?.id);
  const whatsapp = useWhatsAppStatus(profile.data?.activeBusiness?.id);
  const currentDetail = detail.data?.pages[0];
  const leadDetail = useLead(currentDetail?.conversation.leadId ?? "");
  const sendMessage = useSendConversationMessage();
  const sendKnowledgeAsset = useSendKnowledgeAsset(selectedId);
  const retryMessage = useRetryConversationMessage();
  const markRead = useMarkConversationRead();
  const markConversationRead = markRead.mutate;
  const updateStatus = useUpdateConversationStatus();
  const endConversation = useEndConversation();
  const updateConversation = useUpdateConversation();
  const assign = useAssignConversation();
  const remove = useDeleteConversation();
  const updateLead = useUpdateLead();
  const [draft, setDraft] = useState("");
  const [stagedKnowledgeAsset, setStagedKnowledgeAsset] = useState<(StagedKnowledgeAsset & { conversationId: string }) | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const selectedConversation = currentDetail?.conversation;
  const canManage = permissions.canReassignConversationsToOthers || permissions.canViewAllOperationalConversations;
  const canCreateConversation = permissions.canViewAllOperationalConversations || profile.data?.membership?.role === "BUSINESS_OWNER" || profile.data?.membership?.role === "MANAGER";
  const canClaimConversation = permissions.canClaimUnassignedConversations;
  const staffView = profile.data?.membership?.role === "STAFF" && permissions.canViewOperationalQueues;
  const isOwner = profile.data?.membership?.role === "BUSINESS_OWNER";
  const messages = useMemo(() => detail.data ? [...detail.data.pages].reverse().flatMap((page) => page.messages) : [], [detail.data]);
  const selectedIndex = conversations.data?.data.findIndex((item) => item.id === selectedId) ?? -1;

  const setParams = (updates: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    }
    if ("conversationId" in updates) next.delete("conversation");
    router.push(`/conversations${next.size ? `?${next.toString()}` : ""}`);
  };

  useEffect(() => {
    if (selectedConversation?.unreadCount) markConversationRead(selectedConversation.id);
  }, [markConversationRead, selectedConversation?.id, selectedConversation?.unreadCount]);

  const stageKnowledgeAsset = (asset: StagedKnowledgeAsset) => {
    if (!selectedId) return;
    setStagedKnowledgeAsset({ ...asset, conversationId: selectedId });
    setDraft(asset.messageText);
  };
  const activeStagedKnowledgeAsset = stagedKnowledgeAsset?.conversationId === selectedId ? stagedKnowledgeAsset : null;

  const send = () => {
    const content = draft.trim();
    if (!selectedId || !content) return;
    if (activeStagedKnowledgeAsset) {
      sendKnowledgeAsset.mutate(
        { assetType: activeStagedKnowledgeAsset.assetType, assetId: activeStagedKnowledgeAsset.assetId, messageText: content },
        {
          onSuccess: (result) => {
            if (result.status === "SENT") systemNotify.success("Knowledge asset sent to customer.");
            if (result.status === "QUEUED") systemNotify.info("Knowledge asset queued", { description: "It will send when the delivery channel is ready." });
            if (result.status === "FAILED") {
              systemNotify.error("Knowledge asset could not be sent.", { description: result.reason ?? "Please try again." });
              return;
            }
            setDraft("");
            setStagedKnowledgeAsset(null);
          },
          onError: (error) => systemNotify.error("Knowledge asset could not be sent.", { description: getApiErrorMessage(error) }),
        },
      );
      return;
    }
    sendMessage.mutate({ id: selectedId, leadId: selectedConversation?.leadId, input: { content } }, {
      onSuccess: () => setDraft(""),
      onError: (error) => {
        const title = error instanceof ApiError && error.code === "WHATSAPP_NOT_CONNECTED"
          ? "WhatsApp is not connected for this business. Connect WhatsApp in Settings before sending replies."
          : error instanceof ApiError && error.code === "WHATSAPP_DEACTIVATED"
            ? "WhatsApp has been deactivated for this business. Reconnect or change the number to send replies."
            : error instanceof ApiError && error.code === "WHATSAPP_RECONNECTION_REQUIRED"
              ? "This WhatsApp connection needs to be reconnected before messages can be sent."
          : error instanceof ApiError && error.code === "FORBIDDEN"
            ? "You do not have permission to send messages in this conversation."
            : error instanceof ApiError && error.code === "CONVERSATION_CLOSED"
              ? "This conversation is closed."
              : error instanceof ApiError && ["PLAN_LIMIT_REACHED", "CONVERSATION_ACCESS_BLOCKED", "PAYMENT_REQUIRED", "SUBSCRIPTION_INACTIVE"].includes(error.code)
                ? conversationActionError(error)
              : "Message could not be sent. Please try again.";
        systemNotify.error(title, { description: getApiErrorMessage(error) });
      },
    });
  };

  const retry = (messageId: string) => {
    if (!selectedConversation) return;
    retryMessage.mutate(
      { id: selectedConversation.id, leadId: selectedConversation.leadId, messageId },
      {
        onSuccess: () => systemNotify.success("Message sent"),
        onError: (error) => {
          const title = error instanceof ApiError && error.code === "WHATSAPP_NOT_CONNECTED"
            ? "WhatsApp is not connected for this business yet."
            : error instanceof ApiError && error.code === "WHATSAPP_DEACTIVATED"
              ? "WhatsApp has been deactivated for this business."
              : error instanceof ApiError && error.code === "WHATSAPP_RECONNECTION_REQUIRED"
                ? "This WhatsApp connection needs to be reconnected."
            : error instanceof ApiError && error.code === "FORBIDDEN"
              ? "You do not have permission to retry this message."
              : "Message retry failed.";
          systemNotify.error(title, { description: getApiErrorMessage(error) });
        },
      },
    );
  };

  const status = (value: ConversationStatus) => {
    if (!selectedConversation) return;
    if (selectedConversation.status === "CLOSED" && value !== "CLOSED") {
      systemNotify.info("This conversation reopens automatically", { description: "Closed conversations reopen only when a customer sends a new message or an approved automation sends a follow-up." });
      return;
    }
    if (selectedConversation.status === "PLAN_LIMIT_BLOCKED" || selectedConversation.accessBlocked) {
      systemNotify.error("Conversation is locked", { description: "Restore billing, upgrade your plan, or wait for quota reset before changing this conversation." });
      return;
    }
    updateStatus.mutate({ id: selectedConversation.id, status: value }, {
      onSuccess: () => systemNotify.success(value === "CLOSED" ? "Conversation closed" : "Conversation status updated"),
      onError: (error) => systemNotify.error(conversationActionError(error)),
    });
  };

  const end = () => {
    if (!selectedConversation) return;
    endConversation.mutate({ id: selectedConversation.id }, {
      onSuccess: () => systemNotify.success("Conversation ended."),
      onError: (error) => {
        const title = error instanceof ApiError && error.code === "CONVERSATION_ALREADY_CLOSED"
          ? "This conversation is already closed."
          : error instanceof ApiError && error.code === "FORBIDDEN"
            ? "You do not have permission to perform this action."
            : error instanceof ApiError && error.code === "BUSINESS_ACCESS_DENIED"
              ? "You do not have access to this business."
              : "Conversation could not be ended.";
        systemNotify.error(title, { description: getApiErrorMessage(error) });
      },
    });
  };

  const assigneeOptions = selectedConversation ? [
    { value: "__unassigned", label: "Unassigned" },
    ...(selectedConversation.assignedStaff ? [{ value: selectedConversation.assignedStaff.id, label: assigneeName(selectedConversation), description: selectedConversation.assignedStaff.user.email }] : []),
    ...(profile.data?.membership && profile.data.membership.id !== selectedConversation.assignedStaffId
      ? [{ value: profile.data.membership.id, label: "Assign to me", description: profile.data.user.email }]
      : []),
  ] : [];

  if (profile.isPending) {
    return <main className="grid h-[calc(100dvh-4rem)] place-items-center bg-background"><div className="w-full max-w-2xl space-y-4 px-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-[420px] w-full" /></div></main>;
  }

  if (!canViewConversations) {
    return <main className="grid h-[calc(100dvh-4rem)] place-items-center bg-background p-6"><AppErrorState className="w-full max-w-2xl" title="You do not have permission to access this area." description="Switch workspace or ask an owner or manager to update your access." /></main>;
  }

  if (!selectedId) {
    return <><InboxList query={query} activeBusinessId={profile.data?.activeBusiness?.id} currentMembershipId={profile.data?.membership?.id} canCreate={canCreateConversation} canClaim={canClaimConversation} staffView={staffView} onParams={setParams} onCreate={() => setCreateOpen(true)} onSelect={(id) => setParams({ conversationId: id })} /><CreateConversationDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => setParams({ conversationId: id })} /></>;
  }

  if (detail.isPending) {
    return <main className="grid h-[calc(100dvh-4rem)] place-items-center bg-background"><div className="w-full max-w-2xl space-y-4 px-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-[420px] w-full" /><Skeleton className="h-36 w-full" /></div></main>;
  }

  if (detail.isError) {
    const forbidden = detail.error instanceof ApiError && detail.error.code === "FORBIDDEN";
    const blocked = detail.error instanceof ApiError && ["PLAN_LIMIT_REACHED", "CONVERSATION_ACCESS_BLOCKED", "PAYMENT_REQUIRED", "SUBSCRIPTION_INACTIVE"].includes(detail.error.code);
    const closed = detail.error instanceof ApiError && ["CONVERSATION_CLOSED", "REOPEN_REQUIRES_MESSAGE_ACTIVITY"].includes(detail.error.code);
    return <main className="grid h-[calc(100dvh-4rem)] place-items-center bg-background p-6"><AppErrorState className="w-full max-w-2xl" title={forbidden ? "You do not have access to this conversation" : blocked ? "Conversation is locked" : closed ? "Conversation is closed" : detail.error instanceof ApiError && detail.error.code === "CONVERSATION_NOT_FOUND" ? "Conversation not found" : "Could not load conversation"} description={conversationActionError(detail.error)} onRetry={() => detail.refetch()} /></main>;
  }

  if (!selectedConversation) {
    return <AppEmptyState className="m-6 min-h-72" icon={MessageCircleMore} title="Conversation unavailable" description="Return to the inbox and select another conversation." actionLabel="Back to inbox" onAction={() => setParams({ conversationId: undefined })} />;
  }

  return (
    <ConversationWorkspace
      conversation={selectedConversation}
      messages={messages}
      leadDetail={leadDetail.data}
      activities={currentDetail?.activities ?? []}
      assigneeOptions={assigneeOptions}
      canManage={canManage}
      senderName={`${profile.data?.user.firstName ?? ""} ${profile.data?.user.lastName ?? ""}`.trim() || "BizReply Team"}
      whatsappCanSend={selectedConversation.channel !== "WHATSAPP" || (whatsapp.data?.canSendMessages ?? true)}
      whatsappStatus={whatsapp.data?.status}
      isOwner={isOwner}
      businessSetup={businessSetup.data}
      draft={draft}
      stagedKnowledgeAsset={activeStagedKnowledgeAsset}
      sending={sendMessage.isPending || sendKnowledgeAsset.isPending}
      ending={endConversation.isPending}
      retryingMessageId={retryMessage.isPending ? retryMessage.variables?.messageId ?? null : null}
      statusBusy={updateStatus.isPending}
      updateBusy={updateConversation.isPending}
      assignBusy={assign.isPending}
      notesBusy={updateLead.isPending}
      deleting={remove.isPending}
      hasOlder={detail.hasNextPage}
      loadingOlder={detail.isFetchingNextPage}
      hasPrevious={selectedIndex > 0}
      hasNext={selectedIndex >= 0 && selectedIndex < (conversations.data?.data.length ?? 0) - 1}
      onBack={() => setParams({ conversationId: undefined })}
      onPrevious={() => selectedIndex > 0 && setParams({ conversationId: conversations.data?.data[selectedIndex - 1]?.id })}
      onNext={() => selectedIndex >= 0 && setParams({ conversationId: conversations.data?.data[selectedIndex + 1]?.id })}
      onDraftChange={setDraft}
      onStageKnowledgeAsset={stageKnowledgeAsset}
      onClearStagedKnowledgeAsset={() => setStagedKnowledgeAsset(null)}
      onSend={send}
      onEnd={end}
      onRetryMessage={retry}
      onLoadOlder={() => detail.fetchNextPage()}
      onStatus={status}
      onUpdate={(input: UpdateConversationInput) => updateConversation.mutate({ id: selectedConversation.id, input }, { onSuccess: () => systemNotify.success("Conversation workspace updated"), onError: (error) => systemNotify.error(getApiErrorMessage(error)) })}
      onAssign={(assignedStaffId) => assign.mutate({ id: selectedConversation.id, assignedStaffId }, { onSuccess: () => systemNotify.success("Assignment updated"), onError: (error) => systemNotify.error(getApiErrorMessage(error)) })}
      onNotes={(notes) => updateLead.mutate({ id: selectedConversation.leadId, input: { notes } }, { onSuccess: () => { systemNotify.success("Lead notes updated"); void detail.refetch(); }, onError: (error) => systemNotify.error(getApiErrorMessage(error)) })}
      onDelete={() => remove.mutate(selectedConversation.id, { onSuccess: () => { systemNotify.success("Conversation deleted"); setParams({ conversationId: undefined }); }, onError: (error) => systemNotify.error(getApiErrorMessage(error)) })}
    />
  );
}
