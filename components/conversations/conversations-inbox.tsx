"use client";

import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  MessageCircleMore,
  MessageSquarePlus,
  Pin,
  RefreshCw,
  Search,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app-button";
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
import type { Conversation, ConversationListQuery, ConversationStatus, UpdateConversationInput } from "@/types/conversation";

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

function ConversationListSkeleton() {
  return <div className="space-y-2 p-3">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="flex gap-3 rounded-xl border bg-card p-4"><Skeleton className="size-11 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/3" /></div></div>)}</div>;
}

function ConversationListItem({ conversation, onSelect }: { conversation: Conversation; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className="group flex min-h-28 w-full cursor-pointer gap-3 rounded-xl border bg-card p-4 text-left transition-[border-color,box-shadow,background-color] hover:border-primary/25 hover:bg-secondary/20 hover:shadow-[0_8px_24px_rgba(20,35,27,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-xs font-bold", conversation.unreadCount > 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-primary")}>{initials(conversation.lead.fullName)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2"><span className={cn("flex min-w-0 items-center gap-1 truncate text-sm", conversation.unreadCount > 0 ? "font-bold" : "font-semibold")}>{conversation.pinned && <Pin className="size-3 shrink-0 fill-current text-primary" />}<span className="truncate">{conversation.lead.fullName}</span></span><span className="shrink-0 text-[10px] font-medium text-muted-foreground">{formatConversationTime(conversation.lastMessageAt ?? conversation.updatedAt)}</span></span>
        <span className="mt-1 block truncate text-[11px] font-medium text-muted-foreground">{conversation.lead.phone}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{conversation.lastMessagePreview ?? conversation.subject ?? "No messages yet"}</span>
        <span className="mt-3 flex flex-wrap items-center gap-2"><ConversationStatusBadge status={conversation.status} compact /><ConversationChannelBadge channel={conversation.channel} compact /><span className="min-w-0 flex-1 truncate text-[10px] font-medium text-muted-foreground">{conversation.displayId} · {assigneeName(conversation)}</span>{conversation.unreadCount > 0 && <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">{conversation.unreadCount}</span>}</span>
      </span>
    </button>
  );
}

function InboxList({
  query,
  onParams,
  onCreate,
  onSelect,
}: {
  query: ConversationListQuery;
  onParams: (updates: Record<string, string | number | undefined>) => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
}) {
  const conversations = useConversations(query);
  const stats = useConversationStats();

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-background px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><div className="flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Communication center</p><RealtimeStatusIndicator /></div><h1 className="mt-1 text-2xl font-bold">Inbox</h1><p className="mt-1 text-sm text-muted-foreground">Review stored customer conversations and team follow-up.</p></div>
          <AppButton onClick={onCreate}><MessageSquarePlus className="size-4" />New conversation</AppButton>
        </header>

        <section className="mt-6 rounded-2xl border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Search conversations</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><AppInput className="pl-9" placeholder="Search conversations" value={query.search ?? ""} onChange={(event) => onParams({ search: event.target.value || undefined, page: 1 })} /></label>
            <div className="grid grid-cols-2 gap-2 lg:w-[540px] lg:grid-cols-3">
              <AppSelect aria-label="Filter conversation status" value={query.status ?? "ALL"} options={[{ value: "ALL", label: "All statuses" }, ...CONVERSATION_STATUSES.map((status) => ({ value: status, label: CONVERSATION_STATUS_LABELS[status] }))]} onValueChange={(value) => onParams({ status: value === "ALL" ? undefined : value, page: 1 })} />
              <AppSelect aria-label="Filter conversation channel" value={query.channel ?? "ALL"} options={[{ value: "ALL", label: "All channels" }, ...CONVERSATION_CHANNELS.map((channel) => ({ value: channel, label: CONVERSATION_CHANNEL_LABELS[channel] }))]} onValueChange={(value) => onParams({ channel: value === "ALL" ? undefined : value, page: 1 })} />
              <AppSelect aria-label="Filter conversation priority" value={query.priority ?? "ALL"} options={[{ value: "ALL", label: "All priorities" }, ...CONVERSATION_PRIORITIES.map((priority) => ({ value: priority, label: CONVERSATION_PRIORITY_LABELS[priority] }))]} onValueChange={(value) => onParams({ priority: value === "ALL" ? undefined : value, page: 1 })} />
            </div>
            <AppButton variant={query.pinned ? "secondary" : "outline"} aria-pressed={Boolean(query.pinned)} onClick={() => onParams({ pinned: query.pinned ? undefined : "true", page: 1 })}><Pin className="size-4" />Pinned</AppButton>
            <AppButton size="icon" variant="outline" aria-label="Refresh inbox" onClick={() => Promise.all([conversations.refetch(), stats.refetch()])}><RefreshCw className="size-4" /></AppButton>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b px-4 pt-2">
            {[
              { status: undefined, label: "All", count: stats.data?.total ?? 0 },
              { status: "OPEN" as const, label: "Open", count: stats.data?.open ?? 0 },
              { status: "HUMAN_HANDLING" as const, label: "Human handling", count: stats.data?.humanHandling ?? 0 },
              { status: "AI_HANDLING" as const, label: "AI handling", count: stats.data?.aiHandling ?? 0 },
              { status: "CLOSED" as const, label: "Closed", count: stats.data?.closed ?? 0 },
            ].map((item) => <button key={item.label} type="button" onClick={() => onParams({ status: item.status, page: 1 })} className={cn("relative min-h-11 shrink-0 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", query.status === item.status && "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary")}>{item.label} <span className="ml-1 tabular-nums opacity-65">{item.count}</span></button>)}
          </div>

          {conversations.isPending
            ? <ConversationListSkeleton />
            : conversations.isError
              ? <AppErrorState className="m-4 min-h-64 border-0" title="Could not load inbox" description={getApiErrorMessage(conversations.error)} onRetry={() => conversations.refetch()} />
              : conversations.data.data.length === 0
                ? <AppEmptyState className="m-4 min-h-72 border-0" icon={Inbox} title="No conversations yet" description="Start a manual conversation with an existing lead." actionLabel="New conversation" onAction={onCreate} />
                : <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{conversations.data.data.map((conversation) => <ConversationListItem key={conversation.id} conversation={conversation} onSelect={() => onSelect(conversation.id)} />)}</div>}

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
  const selectedId = searchParams.get("conversationId") ?? searchParams.get("conversation") ?? "";
  const conversations = useConversations(query);
  const detail = useConversation(selectedId);
  const profile = useCurrentUser();
  const businessSetup = useBusinessSetupStatus(profile.data?.activeBusiness?.id);
  const whatsapp = useWhatsAppStatus(profile.data?.activeBusiness?.id);
  const currentDetail = detail.data?.pages[0];
  const leadDetail = useLead(currentDetail?.conversation.leadId ?? "");
  const sendMessage = useSendConversationMessage();
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
  const [createOpen, setCreateOpen] = useState(false);
  const selectedConversation = currentDetail?.conversation;
  const canManage = profile.data?.role !== "STAFF";
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

  const send = () => {
    const content = draft.trim();
    if (!selectedId || !content) return;
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
              : "Message could not be sent. Please try again.";
        toast.error(title, { description: getApiErrorMessage(error) });
      },
    });
  };

  const retry = (messageId: string) => {
    if (!selectedConversation) return;
    retryMessage.mutate(
      { id: selectedConversation.id, leadId: selectedConversation.leadId, messageId },
      {
        onSuccess: () => toast.success("Message sent"),
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
          toast.error(title, { description: getApiErrorMessage(error) });
        },
      },
    );
  };

  const status = (value: ConversationStatus) => {
    if (!selectedConversation) return;
    updateStatus.mutate({ id: selectedConversation.id, status: value }, {
      onSuccess: () => toast.success(value === "CLOSED" ? "Conversation closed" : "Conversation status updated"),
      onError: (error) => toast.error(getApiErrorMessage(error)),
    });
  };

  const end = () => {
    if (!selectedConversation) return;
    endConversation.mutate({ id: selectedConversation.id }, {
      onSuccess: () => toast.success("Conversation ended."),
      onError: (error) => {
        const title = error instanceof ApiError && error.code === "CONVERSATION_ALREADY_CLOSED"
          ? "This conversation is already closed."
          : error instanceof ApiError && error.code === "FORBIDDEN"
            ? "You do not have permission to perform this action."
            : error instanceof ApiError && error.code === "BUSINESS_ACCESS_DENIED"
              ? "You do not have access to this business."
              : "Conversation could not be ended.";
        toast.error(title, { description: getApiErrorMessage(error) });
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

  if (!selectedId) {
    return <><InboxList query={query} onParams={setParams} onCreate={() => setCreateOpen(true)} onSelect={(id) => setParams({ conversationId: id })} /><CreateConversationDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => setParams({ conversationId: id })} /></>;
  }

  if (detail.isPending) {
    return <main className="grid h-[calc(100dvh-4rem)] place-items-center bg-background"><div className="w-full max-w-2xl space-y-4 px-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-[420px] w-full" /><Skeleton className="h-36 w-full" /></div></main>;
  }

  if (detail.isError) {
    const forbidden = detail.error instanceof ApiError && detail.error.code === "FORBIDDEN";
    return <main className="grid h-[calc(100dvh-4rem)] place-items-center bg-background p-6"><AppErrorState className="w-full max-w-2xl" title={forbidden ? "You do not have access to this conversation" : detail.error instanceof ApiError && detail.error.code === "CONVERSATION_NOT_FOUND" ? "Conversation not found" : "Could not load conversation"} description={getApiErrorMessage(detail.error)} onRetry={() => detail.refetch()} /></main>;
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
      sending={sendMessage.isPending}
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
      onSend={send}
      onEnd={end}
      onRetryMessage={retry}
      onLoadOlder={() => detail.fetchNextPage()}
      onStatus={status}
      onUpdate={(input: UpdateConversationInput) => updateConversation.mutate({ id: selectedConversation.id, input }, { onSuccess: () => toast.success("Conversation workspace updated"), onError: (error) => toast.error(getApiErrorMessage(error)) })}
      onAssign={(assignedStaffId) => assign.mutate({ id: selectedConversation.id, assignedStaffId }, { onSuccess: () => toast.success("Assignment updated"), onError: (error) => toast.error(getApiErrorMessage(error)) })}
      onNotes={(notes) => updateLead.mutate({ id: selectedConversation.leadId, input: { notes } }, { onSuccess: () => { toast.success("Lead notes updated"); void detail.refetch(); }, onError: (error) => toast.error(getApiErrorMessage(error)) })}
      onDelete={() => remove.mutate(selectedConversation.id, { onSuccess: () => { toast.success("Conversation deleted"); setParams({ conversationId: undefined }); }, onError: (error) => toast.error(getApiErrorMessage(error)) })}
    />
  );
}
