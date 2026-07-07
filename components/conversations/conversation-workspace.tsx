"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Bot,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock3,
  CircleUserRound,
  ExternalLink,
  FileText,
  Forward,
  Link2,
  LockKeyhole,
  MessageCircleMore,
  MessageSquareText,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Pin,
  PinOff,
  Send,
  Trash2,
  TriangleAlert,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { systemNotify } from "@/lib/system-notifications";
import { AppButton } from "@/components/app-button";
import { AppEmptyState } from "@/components/app-empty-state";
import { AppSelect, type AppSelectOption } from "@/components/app-select";
import { IncompleteBusinessNotice } from "@/components/business-setup/incomplete-business-notice";
import { ConversationComposer, type Macro } from "@/components/conversations/composer/conversation-composer";
import { ConversationStatusBadge } from "@/components/conversations/conversation-status-badge";
import { ConversationKnowledgeDrawer, type StagedKnowledgeAsset } from "@/components/knowledge/conversation-knowledge-drawer";
import { RealtimeStatusIndicator } from "@/components/conversations/realtime-status-indicator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ACTIVE_CONVERSATION_STATUSES, CONVERSATION_CHANNEL_LABELS, CONVERSATION_PRIORITIES, CONVERSATION_PRIORITY_LABELS, CONVERSATION_STATUS_LABELS, conversationPriorityTone, formatConversationDateTime, formatMessageTime } from "@/lib/conversations";
import { formatLeadDate, getLeadActivityLabel, LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, leadStatusTone } from "@/lib/leads";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationMessage, ConversationStatus, UpdateConversationInput } from "@/types/conversation";
import type { BusinessSetupStatus } from "@/types/business-setup";
import type { LeadActivity, LeadDetailResponse } from "@/types/lead";

type WorkspaceTab = "conversation" | "tasks" | "activity" | "notes";
type ContextPanel = "knowledge" | "profile" | "internal" | "notes" | "collaborators" | "activity";

type Article = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  tag: string;
  readTime: string;
  visibility: "Public" | "Private";
  frequency: "FAQ" | "Rarely Asked";
};

const RAIL_ITEMS: { id: ContextPanel; label: string; icon: typeof BookOpen }[] = [
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { id: "profile", label: "Lead profile", icon: CircleUserRound },
  { id: "internal", label: "Internal side conversation", icon: MessageSquareText },
  { id: "notes", label: "Notes", icon: NotebookPen },
  { id: "collaborators", label: "Collaborators", icon: UsersRound },
  { id: "activity", label: "Activity", icon: Activity },
];

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function articleFromMetadata(metadata: Record<string, unknown> | null): Article | null {
  const value = metadata?.article;
  if (!value || typeof value !== "object") return null;
  const article = value as Record<string, unknown>;
  if (typeof article.title !== "string") return null;
  return {
    id: typeof article.id === "string" ? article.id : article.title,
    title: article.title,
    summary: typeof article.summary === "string" ? article.summary : "",
    source: typeof article.source === "string" ? article.source : "Knowledge Base",
    url: typeof article.url === "string" ? article.url : "#",
    tag: typeof article.tag === "string" ? article.tag : "Article",
    readTime: typeof article.readTime === "string" ? article.readTime : "Quick read",
    visibility: "Public",
    frequency: "FAQ",
  };
}

function ArticleMessageCard({ article }: { article: Article }) {
  return (
    <a href={article.url} target={article.url === "#" ? undefined : "_blank"} rel="noreferrer" className="mt-3 block rounded-xl border border-primary/15 bg-card p-4 text-foreground transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-primary"><BookOpen className="size-3.5" />{article.source}<span className="text-muted-foreground">· {article.readTime}</span></div>
      <p className="mt-2 font-bold">{article.title}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{article.summary}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">Open article <ExternalLink className="size-3" /></span>
    </a>
  );
}

function MessageBubble({ message, channel, retrying, onRetry }: { message: ConversationMessage; channel: Conversation["channel"]; retrying: boolean; onRetry: () => void }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      systemNotify.success("Message copied");
    } catch {
      systemNotify.error("Could not copy message");
    }
    setActionsOpen(false);
  };

  const placeholderAction = (label: string) => {
    systemNotify.info(`${label} will be connected later.`);
    setActionsOpen(false);
  };

  if (message.senderType === "SYSTEM") {
    return (
      <div className="my-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <span className="h-px w-8 bg-border" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1.5 font-medium"><Activity className="size-3.5" />{message.content} · {formatMessageTime(message.createdAt)}</span>
        <span className="h-px w-8 bg-border" />
      </div>
    );
  }

  const inboundCustomer = message.senderType === "CUSTOMER" && message.direction === "INBOUND";
  const outbound = !inboundCustomer && (message.direction === "OUTBOUND" || message.senderType === "STAFF" || message.senderType === "AI");
  const senderName = message.senderType === "AI"
    ? "AI assistant"
    : message.senderUser
      ? `${message.senderUser.firstName} ${message.senderUser.lastName}`
      : message.senderType === "CUSTOMER" ? "Customer" : "Team";
  const article = articleFromMetadata(message.metadata);
  const showWhatsAppStatus = channel === "WHATSAPP" && message.senderType === "STAFF" && message.direction === "OUTBOUND";
  const failed = showWhatsAppStatus && message.deliveryStatus === "FAILED";

  return (
    <article
      className={cn("group relative mb-6 flex gap-3", outbound && "flex-row-reverse")}
      onContextMenu={(event) => {
        event.preventDefault();
        setActionsOpen((open) => !open);
      }}
      onTouchStart={() => {
        clearLongPress();
        longPressTimer.current = window.setTimeout(() => setActionsOpen(true), 520);
      }}
      onTouchMove={clearLongPress}
      onTouchEnd={clearLongPress}
      onTouchCancel={clearLongPress}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[10px] font-bold", outbound ? "bg-primary text-primary-foreground" : "bg-secondary text-primary")}>
        {message.senderType === "AI" ? <Bot className="size-4" /> : initials(senderName)}
      </span>
      <div className={cn("min-w-0 max-w-[88%] md:max-w-[76%]", outbound && "text-right")}>
        <div className={cn("mb-1.5 flex flex-wrap items-center gap-1.5 text-xs", outbound && "justify-end")}>
          <span className="font-bold text-foreground">{senderName}</span>
          <span className="text-muted-foreground">{formatMessageTime(message.createdAt)}</span>
          {message.senderType === "AI" && <span className="rounded-md bg-info/10 px-1.5 py-0.5 text-[10px] font-bold text-info">AI</span>}
        </div>
        <div className={cn("rounded-2xl px-4 py-3 text-left text-sm leading-6", outbound ? "rounded-tr-sm bg-secondary text-secondary-foreground" : "rounded-tl-sm border bg-card text-foreground")}>
          {message.content}
          {article && <ArticleMessageCard article={article} />}
        </div>
        {showWhatsAppStatus && (
          <div className={cn("mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground", outbound && "justify-end")}>
            <span className={cn("inline-flex items-center gap-1", failed && "font-semibold text-destructive")}>
              {message.deliveryStatus === "PENDING" && <><Clock3 className="size-3" />Sending...</>}
              {message.deliveryStatus === "SENT" && <><Check className="size-3" />Sent</>}
              {message.deliveryStatus === "DELIVERED" && <><CheckCheck className="size-3" />Delivered</>}
              {message.deliveryStatus === "READ" && <><CheckCheck className="size-3 text-primary" />Read</>}
              {message.deliveryStatus === "FAILED" && <><TriangleAlert className="size-3" />Failed</>}
              {message.deliveryStatus === "INTERNAL" && <>Stored internally</>}
            </span>
            {failed && <AppButton size="sm" variant="ghost" className="h-6 min-h-6 px-2 text-[10px]" loading={retrying} loadingText="Retrying" onClick={onRetry}>Retry</AppButton>}
          </div>
        )}
      </div>
      {actionsOpen && (
        <div className={cn("absolute top-2 z-30 w-40 rounded-xl border bg-popover p-1.5 text-xs shadow-[0_16px_40px_rgba(20,35,27,0.18)]", outbound ? "right-12" : "left-12")}>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={() => void copyMessage()}><Clipboard className="size-3.5" />Copy</button>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={() => placeholderAction("Forward to internal discussion")}><Forward className="size-3.5" />Forward</button>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={() => placeholderAction("Pin message")}><Pin className="size-3.5" />Pin</button>
          <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring" onClick={() => placeholderAction("Delete message")}><Trash2 className="size-3.5" />Delete</button>
        </div>
      )}
    </article>
  );
}

function ConversationTimeline({ messages, channel, retryingMessageId, hasOlder, loadingOlder, onLoadOlder, onRetryMessage }: { messages: ConversationMessage[]; channel: Conversation["channel"]; retryingMessageId: string | null; hasOlder: boolean; loadingOlder: boolean; onLoadOlder: () => void; onRetryMessage: (messageId: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldFollow = useRef(true);
  const lastMessageId = messages.at(-1)?.id;

  useEffect(() => {
    if (shouldFollow.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lastMessageId]);

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        const element = event.currentTarget;
        shouldFollow.current = element.scrollHeight - element.scrollTop - element.clientHeight < 140;
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-8"
    >
      <div className="mx-auto max-w-4xl">
        {hasOlder && <div className="mb-7 flex justify-center"><AppButton size="sm" variant="outline" loading={loadingOlder} onClick={onLoadOlder}>Load older messages</AppButton></div>}
        {messages.length === 0
          ? <AppEmptyState className="min-h-64 border-0 bg-transparent" icon={MessageCircleMore} title="No messages yet" description="Send the first stored message to begin this conversation." />
          : messages.map((message) => <MessageBubble key={message.id} message={message} channel={channel} retrying={retryingMessageId === message.id} onRetry={() => onRetryMessage(message.id)} />)}
      </div>
    </div>
  );
}

const REPLY_MACROS: Macro[] = [
  { id: "welcome", title: "Welcome message", content: "Hi, thanks for reaching out. How can we help you today?" },
  { id: "follow-up", title: "Follow-up", content: "Thanks for the details. Our team will review this and get back to you shortly." },
  { id: "appointment", title: "Appointment request", content: "What day and time would work best for your appointment?" },
];

function MessageComposer({ draft, stagedKnowledgeAsset, onDraftChange, onClearStagedKnowledgeAsset, onSend, onEnd, sending, ending, closed, closedAt, channel, senderName, whatsappCanSend, whatsappStatus, isOwner }: { draft: string; stagedKnowledgeAsset?: StagedKnowledgeAsset | null; onDraftChange: (value: string) => void; onClearStagedKnowledgeAsset?: () => void; onSend: () => void; onEnd: () => void; sending: boolean; ending: boolean; closed: boolean; closedAt: string | null; channel: Conversation["channel"]; senderName: string; whatsappCanSend: boolean; whatsappStatus?: string; isOwner: boolean }) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setEmojiOpen(false);
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEmojiOpen(false);
      }
    };

    if (emojiOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscKey);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscKey);
      };
    }
  }, [emojiOpen]);

  if (closed) {
    return <div className="border-t bg-card px-4 py-3"><div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3"><div><p className="text-sm font-semibold">This conversation is closed</p><p className="text-xs leading-5 text-muted-foreground">{closedAt ? `Closed ${formatConversationDateTime(closedAt)}. ` : ""}It will reopen automatically if the customer sends another message or an approved automation sends a follow-up.</p></div></div></div>;
  }

  const whatsAppBlocked = channel === "WHATSAPP" && !whatsappCanSend;
  const blockedMessage = whatsappStatus === "DEACTIVATED"
    ? "WhatsApp has been deactivated for this business. Reconnect or change the number to send replies."
    : whatsappStatus === "ERROR"
      ? "This WhatsApp connection needs to be reconnected before messages can be sent."
      : "WhatsApp is not connected for this business. Connect WhatsApp in Settings before sending replies.";

  return (
    <div className="border-t bg-card px-3 py-2 sm:px-6 sm:py-3">
      <div className="relative mx-auto max-w-4xl">
        {whatsAppBlocked && <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-muted-foreground"><span>{blockedMessage}</span>{isOwner ? <a href="/settings/business/whatsapp" className="font-semibold text-primary underline underline-offset-4">Go to WhatsApp Settings</a> : <span className="font-semibold">Ask the business owner to reconnect WhatsApp.</span>}</div>}
        {stagedKnowledgeAsset && <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-secondary/70 px-3 py-2 text-xs text-primary">
          <span className="min-w-0 truncate"><BookOpen className="mr-1.5 inline size-3.5" />Attached: <strong>{stagedKnowledgeAsset.title}</strong></span>
          <button type="button" className="shrink-0 font-bold underline underline-offset-4 hover:text-primary/80" onClick={onClearStagedKnowledgeAsset}>Remove</button>
        </div>}
        <ConversationComposer
          channels={[
            { id: channel, name: CONVERSATION_CHANNEL_LABELS[channel], description: channel === "WHATSAPP" ? "WhatsApp delivery" : "Stored internally" },
          ]}
          activeChannelId={channel}
          senderAccounts={[{ id: "CURRENT_USER", name: senderName }]}
          activeSenderAccountId="CURRENT_USER"
          macros={REPLY_MACROS}
          message={draft}
          isSending={sending}
          disabled={whatsAppBlocked}
          endChatTrigger={<ConfirmDialog trigger={<button type="button" disabled={ending} className="min-h-8 cursor-pointer px-2 text-xs font-semibold text-composer-foreground underline decoration-composer-foreground/35 underline-offset-4 outline-none hover:decoration-composer-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40">End Chat</button>} title="End this conversation?" description="The conversation will be closed. If the customer replies later, BizReply will automatically reopen it." confirmLabel="End Chat" loading={ending} onConfirm={onEnd} />}
          attachmentDisabled
          voiceNoteDisabled
          onMessageChange={onDraftChange}
          onSendMessage={onSend}
          onOpenEmojiPicker={() => setEmojiOpen((open) => !open)}
        />
        {emojiOpen && <div ref={emojiRef} className="absolute bottom-12 left-10 z-20 flex w-56 flex-wrap gap-1 rounded-xl border bg-popover p-2 shadow-[0_14px_40px_rgba(20,35,27,0.16)]" aria-label="Emoji picker">{["🙂", "👍", "🙏", "✅", "🎉", "📅", "📍", "💬", "❤️", "👋", "😊", "🤝"].map((emoji) => <button key={emoji} type="button" className="grid size-9 place-items-center rounded-lg text-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { onDraftChange(`${draft}${emoji}`); setEmojiOpen(false); }}>{emoji}</button>)}</div>}
        <p className="mt-1.5 hidden px-1 text-[10px] text-muted-foreground sm:block">{channel === "WHATSAPP" ? "Replies are sent through the connected WhatsApp provider." : "Stored in BizReply only."}</p>
      </div>
    </div>
  );
}

function blockedReasonLabel(reason?: string | null) {
  if (reason === "PAYMENT_FAILED") return "Payment failed";
  if (reason === "SUBSCRIPTION_EXPIRED") return "Subscription expired";
  if (reason === "PLAN_LIMIT_REACHED") return "Plan limit reached";
  return "Access locked";
}

function LockedConversationState({ conversation, canManageBilling }: { conversation: Conversation; canManageBilling: boolean }) {
  const receivedAt = conversation.lastMessageAt ?? conversation.updatedAt;
  return (
    <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-6">
      <div className="w-full max-w-2xl rounded-3xl border border-warning/25 bg-card p-6 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"><LockKeyhole className="size-6" /></span>
        <div className="mt-5 flex justify-center"><ConversationStatusBadge status="PLAN_LIMIT_BLOCKED" /></div>
        <h2 className="mt-4 text-xl font-bold">This customer message is locked</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This customer message is locked because your account has reached its conversation limit or payment is inactive. Restore payment, upgrade your plan, or wait for quota reset to unlock it.
        </p>
        <dl className="mt-6 grid gap-3 rounded-2xl bg-muted/45 p-4 text-left text-sm sm:grid-cols-2">
          <div><dt className="text-xs font-bold text-muted-foreground">Customer</dt><dd className="mt-1 font-semibold">{conversation.lead.fullName}</dd></div>
          <div><dt className="text-xs font-bold text-muted-foreground">Received</dt><dd className="mt-1 font-semibold">{formatConversationDateTime(receivedAt)}</dd></div>
          <div><dt className="text-xs font-bold text-muted-foreground">Reason</dt><dd className="mt-1 font-semibold">{blockedReasonLabel(conversation.accessBlockedReason)}</dd></div>
          <div><dt className="text-xs font-bold text-muted-foreground">Reference</dt><dd className="mt-1 font-semibold">{conversation.displayId}</dd></div>
        </dl>
        {canManageBilling ? <AppButton asChild className="mt-6"><a href="/settings/billing">View Billing</a></AppButton> : <p className="mt-6 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground">Ask an owner or manager to restore billing or upgrade the plan.</p>}
      </div>
    </div>
  );
}

function ConversationReplyNotice({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="border-t bg-card px-4 py-3">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-xl bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold">{title}</p><p className="text-xs leading-5 text-muted-foreground">{description}</p></div>
        {action}
      </div>
    </div>
  );
}

function SideConversationPanel({ conversation }: { conversation: Conversation }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<{ id: number; mine: boolean; content: string }[]>([]);
  const send = () => {
    if (!draft.trim()) return;
    setMessages((current) => [...current, { id: Date.now(), mine: true, content: draft.trim() }]);
    setDraft("");
    systemNotify.info("Internal chat is a local placeholder for now.");
  };
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4"><h3 className="font-bold">Internal discussion</h3><p className="mt-1 text-xs text-muted-foreground">Private team notes about {conversation.lead.fullName}. These are never sent to the customer.</p></div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <div className="rounded-xl border border-accent/25 bg-accent/10 p-3"><div className="flex items-center gap-2 text-xs font-bold"><Link2 className="size-4 text-accent" />Conversation context</div><p className="mt-2 text-xs leading-5 text-muted-foreground">{conversation.subject ?? `Conversation with ${conversation.lead.fullName}`}</p></div>
        {messages.length === 0 ? <AppEmptyState className="min-h-48 border-0 bg-transparent" icon={UsersRound} title="No private discussion yet" description="Use this space for team-only context. Backend connection is coming later." /> : messages.map((message) => <div key={message.id} className={cn("max-w-[88%] rounded-xl px-3 py-2 text-sm", message.mine ? "ml-auto bg-secondary text-secondary-foreground" : "border bg-card")}>{message.content}</div>)}
      </div>
      <div className="border-t p-3"><label htmlFor="internal-composer" className="sr-only">Private internal message</label><textarea id="internal-composer" value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} placeholder="Write a private team note..." className="w-full resize-none rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /><AppButton className="mt-2 w-full" size="sm" onClick={send} disabled={!draft.trim()}><Send className="size-4" />Add private note</AppButton></div>
    </div>
  );
}

function LeadProfilePanel({ conversation, leadDetail, assigneeOptions, canManage, statusBusy, assignBusy, onStatus, onAssign }: { conversation: Conversation; leadDetail?: LeadDetailResponse; assigneeOptions: AppSelectOption[]; canManage: boolean; statusBusy: boolean; assignBusy: boolean; onStatus: (status: ConversationStatus) => void; onAssign: (id: string | null) => void }) {
  const canUpdateStatus = conversation.status !== "CLOSED" && conversation.status !== "PLAN_LIMIT_BLOCKED" && conversation.permissions?.canUpdateStatus !== false;
  const canAssign = canManage && conversation.status !== "CLOSED" && conversation.status !== "PLAN_LIMIT_BLOCKED" && conversation.permissions?.canAssign !== false;
  const lead = leadDetail?.lead;
  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b p-5"><span className="grid size-14 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">{initials(conversation.lead.fullName)}</span><h3 className="mt-3 text-lg font-bold">{conversation.lead.fullName}</h3><p className="mt-1 text-sm text-muted-foreground">{conversation.lead.email ?? conversation.lead.phone}</p></div>
      <div className="space-y-6 p-5">
        <section><h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Conversation</h4><div className="mt-3 space-y-3"><div><label htmlFor="drawer-status" className="mb-1 block text-xs font-semibold">Status</label>{canUpdateStatus ? <AppSelect id="drawer-status" value={conversation.status} options={ACTIVE_CONVERSATION_STATUSES.map((status) => ({ value: status, label: CONVERSATION_STATUS_LABELS[status] }))} disabled={statusBusy} onValueChange={(value) => onStatus(value as ConversationStatus)} /> : <ConversationStatusBadge status={conversation.status} />}</div>{canAssign && <div><label htmlFor="drawer-assignee" className="mb-1 block text-xs font-semibold">Assigned staff</label><AppSelect id="drawer-assignee" value={conversation.assignedStaffId ?? "__unassigned"} options={assigneeOptions} disabled={assignBusy} onValueChange={(value) => onAssign(value === "__unassigned" ? null : value)} /></div>}</div></section>
        <section><h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Lead profile</h4><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="mt-1 font-medium">{conversation.lead.phone}</dd></div><div><dt className="text-xs text-muted-foreground">Email</dt><dd className="mt-1 font-medium">{conversation.lead.email ?? "No email provided"}</dd></div>{lead && <><div><dt className="text-xs text-muted-foreground">Lead status</dt><dd className={cn("mt-1 inline-flex rounded-md px-2 py-1 text-xs font-bold", leadStatusTone(lead.status))}>{LEAD_STATUS_LABELS[lead.status]}</dd></div><div><dt className="text-xs text-muted-foreground">Source</dt><dd className="mt-1 font-medium">{LEAD_SOURCE_LABELS[lead.source]}</dd></div></>}</dl></section>
        <section><h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Tags</h4><div className="mt-3 flex flex-wrap gap-1.5">{lead?.tags.length ? lead.tags.map((tag) => <span key={tag} className="rounded-lg bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">{tag}</span>) : <span className="text-xs text-muted-foreground">No tags</span>}</div></section>
      </div>
    </div>
  );
}

function NotesPanel({ notes, saving, onSave }: { notes?: string | null; saving: boolean; onSave: (notes: string | null) => void }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes ?? "");
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">Lead notes</h3><p className="mt-1 text-xs text-muted-foreground">Shared context stored on the lead profile.</p></div>{!editing && <AppButton size="sm" variant="outline" onClick={() => { setValue(notes ?? ""); setEditing(true); }}><Pencil className="size-3.5" />{notes ? "Edit" : "Add note"}</AppButton>}</div>
      {editing
        ? <form className="mt-5" onSubmit={(event) => { event.preventDefault(); onSave(value.trim() || null); setEditing(false); }}><label htmlFor={id} className="sr-only">Lead notes</label><textarea id={id} rows={8} autoFocus value={value} onChange={(event) => setValue(event.target.value)} className="w-full resize-y rounded-xl border bg-background p-3 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Add useful context for your team..." /><div className="mt-3 flex justify-end gap-2"><AppButton type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</AppButton><AppButton type="submit" size="sm" loading={saving} loadingText="Saving">Save notes</AppButton></div></form>
        : <div className="mt-5 whitespace-pre-wrap rounded-xl border bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">{notes || "No lead notes have been added yet."}</div>}
    </div>
  );
}

function ActivityPanel({ activities }: { activities: LeadActivity[] }) {
  return <div className="h-full overflow-y-auto p-5"><h3 className="font-bold">Recent activity</h3><ol className="mt-5 space-y-5">{activities.length ? activities.map((item) => <li key={item.id} className="relative border-l-2 border-secondary pl-4"><span className="absolute -left-[5px] top-0 size-2 rounded-full bg-primary" /><p className="text-sm font-semibold">{getLeadActivityLabel(item.action)}</p><p className="mt-1 text-xs text-muted-foreground">{item.actor ? `${item.actor.firstName} ${item.actor.lastName} · ` : ""}{formatLeadDate(item.createdAt)}</p></li>) : <li><AppEmptyState className="min-h-52 border-0" icon={Activity} title="No activity yet" description="Lead and conversation events will appear here." /></li>}</ol></div>;
}

function ConversationContextDrawer({ active, open, onClose, conversation, leadDetail, activities, assigneeOptions, canManage, canStageKnowledgeAssets, knowledgeStageUnavailableReason, statusBusy, assignBusy, notesBusy, onStageKnowledgeAsset, onStatus, onAssign, onNotes }: { active: ContextPanel; open: boolean; onClose: () => void; conversation: Conversation; leadDetail?: LeadDetailResponse; activities: LeadActivity[]; assigneeOptions: AppSelectOption[]; canManage: boolean; canStageKnowledgeAssets: boolean; knowledgeStageUnavailableReason?: string | null; statusBusy: boolean; assignBusy: boolean; notesBusy: boolean; onStageKnowledgeAsset?: (asset: StagedKnowledgeAsset) => void; onStatus: (status: ConversationStatus) => void; onAssign: (id: string | null) => void; onNotes: (notes: string | null) => void }) {
  const title = RAIL_ITEMS.find((item) => item.id === active)?.label ?? "Context";
  return (
    <aside
      data-open={open}
      className="conversation-context-drawer fixed inset-y-0 right-0 z-50 flex h-full w-full min-h-0 flex-col border-l bg-card shadow-[0_16px_50px_rgba(20,35,27,0.16)] transition-[transform,opacity] duration-300 ease-out data-[open=false]:pointer-events-none data-[open=false]:translate-x-6 data-[open=false]:opacity-0 data-[open=true]:translate-x-0 data-[open=true]:opacity-100 sm:w-[380px] xl:static xl:w-[340px] xl:translate-x-0 xl:shadow-none xl:data-[open=false]:translate-x-4"
      aria-label={title}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4 xl:hidden"><p className="font-bold">{title}</p><AppButton size="icon" variant="ghost" aria-label="Close context panel" onClick={onClose}><X className="size-4" /></AppButton></div>
      <div key={active} className="conversation-context-content min-h-0 flex-1">
        {active === "knowledge" && <ConversationKnowledgeDrawer conversationId={conversation.id} canManage={canManage} canStageAssets={canStageKnowledgeAssets} stageUnavailableReason={knowledgeStageUnavailableReason} onStageAsset={onStageKnowledgeAsset} />}
        {active === "profile" && <LeadProfilePanel conversation={conversation} leadDetail={leadDetail} assigneeOptions={assigneeOptions} canManage={canManage} statusBusy={statusBusy} assignBusy={assignBusy} onStatus={onStatus} onAssign={onAssign} />}
        {active === "internal" && <SideConversationPanel conversation={conversation} />}
        {active === "notes" && <NotesPanel notes={leadDetail?.lead.notes} saving={notesBusy} onSave={onNotes} />}
        {active === "activity" && <ActivityPanel activities={activities} />}
        {active === "collaborators" && <AppEmptyState className="m-4 min-h-64 border-0" icon={UsersRound} title="Collaborators coming soon" description="This panel is prepared for future conversation collaborators." />}
      </div>
    </aside>
  );
}

function ConversationRightRail({ active, onSelect }: { active: ContextPanel | null; onSelect: (panel: ContextPanel) => void }) {
  return (
    <aside className="relative hidden w-14 shrink-0 flex-col items-center gap-2 border-l bg-card py-3 md:flex" aria-label="Conversation context tools">
      {RAIL_ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return <div key={id} className="relative">
          <span className={cn("pointer-events-none absolute -left-2 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-[opacity,transform] duration-200 ease-out", isActive ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0")} />
          <AppButton size="icon" variant={isActive ? "secondary" : "ghost"} className={cn("size-10 min-h-10 transition-[transform,background-color,color,box-shadow] duration-200 ease-out hover:-translate-x-0.5", isActive && "-translate-x-1 shadow-[0_5px_14px_rgba(7,94,69,0.12)]")} aria-label={label} aria-pressed={isActive} title={label} onClick={() => onSelect(id)}><Icon className={cn("size-4 transition-transform duration-200 ease-out", isActive && "scale-110")} /></AppButton>
        </div>;
      })}
    </aside>
  );
}

function ConversationTabs({ active, onChange, activityCount }: { active: WorkspaceTab; onChange: (tab: WorkspaceTab) => void; activityCount: number }) {
  const tabs: { id: WorkspaceTab; label: string }[] = [{ id: "conversation", label: "Conversation" }, { id: "tasks", label: "Tasks" }, { id: "activity", label: "Activity logs" }, { id: "notes", label: "Notes" }];
  return (
    <div className="flex min-h-12 items-end gap-1 overflow-x-auto border-b bg-card px-3 sm:justify-center">
      {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => onChange(tab.id)} className={cn("relative min-h-11 shrink-0 px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", active === tab.id && "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary")}>{tab.label}{tab.id === "activity" && activityCount ? <span className="ml-1.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">{activityCount}</span> : null}</button>)}
    </div>
  );
}

export function ConversationWorkspace({
  conversation,
  messages,
  leadDetail,
  activities,
  assigneeOptions,
  canManage,
  senderName,
  whatsappCanSend,
  whatsappStatus,
  isOwner,
  businessSetup,
  draft,
  stagedKnowledgeAsset,
  sending,
  ending,
  retryingMessageId,
  statusBusy,
  updateBusy,
  assignBusy,
  notesBusy,
  deleting,
  hasOlder,
  loadingOlder,
  hasPrevious,
  hasNext,
  onBack,
  onPrevious,
  onNext,
  onDraftChange,
  onStageKnowledgeAsset,
  onClearStagedKnowledgeAsset,
  onSend,
  onEnd,
  onRetryMessage,
  onLoadOlder,
  onStatus,
  onUpdate,
  onAssign,
  onNotes,
  onDelete,
}: {
  conversation: Conversation;
  messages: ConversationMessage[];
  leadDetail?: LeadDetailResponse;
  activities: LeadActivity[];
  assigneeOptions: AppSelectOption[];
  canManage: boolean;
  senderName: string;
  whatsappCanSend: boolean;
  whatsappStatus?: string;
  isOwner: boolean;
  businessSetup?: BusinessSetupStatus;
  draft: string;
  stagedKnowledgeAsset?: StagedKnowledgeAsset | null;
  sending: boolean;
  ending: boolean;
  retryingMessageId: string | null;
  statusBusy: boolean;
  updateBusy: boolean;
  assignBusy: boolean;
  notesBusy: boolean;
  deleting: boolean;
  hasOlder: boolean;
  loadingOlder: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDraftChange: (value: string) => void;
  onStageKnowledgeAsset?: (asset: StagedKnowledgeAsset) => void;
  onClearStagedKnowledgeAsset?: () => void;
  onSend: () => void;
  onEnd: () => void;
  onRetryMessage: (messageId: string) => void;
  onLoadOlder: () => void;
  onStatus: (status: ConversationStatus) => void;
  onUpdate: (input: UpdateConversationInput) => void;
  onAssign: (id: string | null) => void;
  onNotes: (notes: string | null) => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<WorkspaceTab>("conversation");
  const [context, setContext] = useState<ContextPanel | null>(null);
  const [renderedContext, setRenderedContext] = useState<ContextPanel>("knowledge");
  const [editingSubject, setEditingSubject] = useState(false);
  const [subject, setSubject] = useState(conversation.subject ?? "");
  const locked = conversation.status === "PLAN_LIMIT_BLOCKED" || Boolean(conversation.accessBlocked);
  const closed = conversation.status === "CLOSED";
  const canViewMessages = conversation.permissions?.canViewMessages !== false;
  const canReply = !locked && !closed && conversation.permissions?.canReply !== false;
  const canClose = !locked && !closed && conversation.permissions?.canClose !== false;
  const canAssign = canManage && !locked && !closed && conversation.permissions?.canAssign !== false;
  const canUpdateStatus = !locked && !closed && conversation.permissions?.canUpdateStatus !== false;
  const canEditConversation = canManage && !locked && conversation.permissions?.canAssign !== false;
  const whatsAppBlocked = conversation.channel === "WHATSAPP" && !whatsappCanSend;
  const whatsAppBlockedMessage = whatsappStatus === "DEACTIVATED"
    ? "WhatsApp has been deactivated for this business. Reconnect or change the number to send replies."
    : whatsappStatus === "ERROR"
      ? "This WhatsApp connection needs to be reconnected before messages can be sent."
      : "WhatsApp is not connected for this business. Connect WhatsApp in Settings before sending replies.";
  const knowledgeStageUnavailableReason = locked
    ? "Replies are locked. Restore billing, upgrade your plan, or wait for quota reset before adding knowledge assets."
    : closed
      ? "This conversation is closed. Knowledge assets can be added after the conversation reopens."
      : conversation.permissions?.canReply === false
        ? "You do not have permission to reply in this conversation."
        : whatsAppBlocked
          ? whatsAppBlockedMessage
          : null;
  const canStageKnowledgeAssets = !knowledgeStageUnavailableReason;

  const toggleContext = (panel: ContextPanel) => {
    if (context === panel) {
      setContext(null);
      return;
    }
    setRenderedContext(panel);
    setContext(panel);
  };

  return (
    <main className="flex h-[calc(100dvh-4rem)] min-h-[620px] overflow-hidden bg-background">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 shrink-0 items-center gap-2 border-b bg-card px-3 sm:px-4">
          <AppButton size="icon" variant="ghost" aria-label="Back to inbox" title="Back to inbox" onClick={onBack}><ArrowLeft className="size-4" /></AppButton>
          <div className="hidden items-center gap-1 sm:flex"><AppButton size="icon" variant="ghost" className="size-9 min-h-9" aria-label="Previous conversation" disabled={!hasPrevious} onClick={onPrevious}><ChevronLeft className="size-4" /></AppButton><AppButton size="icon" variant="ghost" className="size-9 min-h-9" aria-label="Next conversation" disabled={!hasNext} onClick={onNext}><ChevronRight className="size-4" /></AppButton></div>
          <div className="min-w-0 flex-1 sm:ml-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden shrink-0 text-xs font-bold text-primary sm:inline">{conversation.displayId}</span>
              {editingSubject
                ? <form className="flex min-w-0 flex-1 items-center gap-1" onSubmit={(event) => { event.preventDefault(); onUpdate({ subject: subject.trim() || null }); setEditingSubject(false); }}><label className="sr-only" htmlFor="conversation-subject">Conversation subject</label><input id="conversation-subject" autoFocus value={subject} onChange={(event) => setSubject(event.target.value)} className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring" /><AppButton type="submit" size="sm" className="h-8 min-h-8" loading={updateBusy}>Save</AppButton><AppButton type="button" size="sm" variant="ghost" className="h-8 min-h-8" onClick={() => { setSubject(conversation.subject ?? ""); setEditingSubject(false); }}>Cancel</AppButton></form>
                : <><h1 className="truncate text-sm font-bold sm:text-base"><span className="sm:hidden">{conversation.lead.fullName}</span><span className="hidden sm:inline">{conversation.subject ?? conversation.lead.fullName}</span></h1>{canEditConversation && <AppButton size="icon" variant="ghost" className="hidden size-8 min-h-8 shrink-0 sm:grid" aria-label="Edit conversation subject" onClick={() => setEditingSubject(true)}><Pencil className="size-3.5" /></AppButton>}</>}
            </div>
            <p className="mt-0.5 hidden items-center gap-2 truncate text-[11px] text-muted-foreground sm:flex"><span className="truncate">{conversation.lead.fullName} · {CONVERSATION_CHANNEL_LABELS[conversation.channel]} channel</span><span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold", conversationPriorityTone(conversation.priority))}>{CONVERSATION_PRIORITY_LABELS[conversation.priority]}</span></p>
          </div>
          <RealtimeStatusIndicator className="hidden sm:inline-flex" />
          {!locked && <AppButton size="icon" variant={conversation.pinned ? "secondary" : "ghost"} className="shrink-0" loading={updateBusy} aria-label={conversation.pinned ? "Unpin conversation" : "Pin conversation"} aria-pressed={conversation.pinned} onClick={() => onUpdate({ pinned: !conversation.pinned })}>{conversation.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}</AppButton>}
          {canEditConversation && <div className="hidden w-32 xl:block"><AppSelect aria-label="Conversation priority" value={conversation.priority} options={CONVERSATION_PRIORITIES.map((priority) => ({ value: priority, label: CONVERSATION_PRIORITY_LABELS[priority] }))} disabled={updateBusy} onValueChange={(priority) => onUpdate({ priority: priority as Conversation["priority"] })} /></div>}
          {!canUpdateStatus
            ? <ConversationStatusBadge status={conversation.status} />
            : <div className="hidden w-44 lg:block"><AppSelect aria-label="Conversation status" value={conversation.status} options={ACTIVE_CONVERSATION_STATUSES.map((status) => ({ value: status, label: CONVERSATION_STATUS_LABELS[status] }))} disabled={statusBusy} onValueChange={(value) => onStatus(value as ConversationStatus)} /></div>}
          <AppButton size="icon" variant="ghost" aria-label="Open lead profile" className="md:hidden" onClick={() => toggleContext("profile")}><CircleUserRound className="size-4" /></AppButton>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <AppButton size="icon" variant="ghost" aria-label="Conversation actions" className="md:hidden"><MoreHorizontal className="size-4" /></AppButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={8} className="account-menu-content z-[80] min-w-52 rounded-xl border bg-popover p-1.5 shadow-[0_14px_40px_rgba(20,35,27,0.14)]">
                {canEditConversation && <DropdownMenu.Item onSelect={() => setEditingSubject(true)} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold outline-none data-[highlighted]:bg-muted"><Pencil className="size-3.5" />Edit conversation</DropdownMenu.Item>}
                {canClose && <DropdownMenu.Item disabled={ending} onSelect={() => { if (window.confirm("End this conversation?")) onEnd(); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-muted"><X className="size-3.5" />End Chat</DropdownMenu.Item>}
                {canManage && !locked && <DropdownMenu.Item disabled={deleting} onSelect={() => { if (window.confirm("Delete this conversation from the business inbox?")) onDelete(); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-destructive outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-destructive/10"><Trash2 className="size-3.5" />Delete chat</DropdownMenu.Item>}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          {canManage && !locked && <ConfirmDialog trigger={<AppButton size="icon" variant="ghost" className="hidden md:inline-flex" aria-label="Delete conversation" title="Delete conversation"><MoreHorizontal className="size-4" /></AppButton>} title="Delete this conversation?" description="The conversation will disappear from this business inbox." confirmLabel="Delete conversation" loading={deleting} onConfirm={onDelete} />}
          {canClose && <ConfirmDialog trigger={<AppButton size="sm" className="hidden sm:inline-flex">End Chat</AppButton>} title="End this conversation?" description="The conversation will be closed. If the customer replies later, BizReply will automatically reopen it." confirmLabel="End Chat" loading={ending} onConfirm={onEnd} />}
        </header>

        <ConversationTabs active={tab} onChange={setTab} activityCount={activities.length} />
        {businessSetup && <IncompleteBusinessNotice status={businessSetup} canManage={canManage} />}
        <div className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-1.5 md:hidden" aria-label="Conversation context tools">
          {RAIL_ITEMS.map(({ id, label, icon: Icon }) => <AppButton key={id} size="icon" variant={context === id ? "secondary" : "ghost"} className="size-9 min-h-9 shrink-0 rounded-full" aria-label={label} aria-pressed={context === id} title={label} onClick={() => toggleContext(id)}><Icon className="size-4" /></AppButton>)}
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            {tab === "conversation" && (locked && !canViewMessages
              ? <LockedConversationState conversation={conversation} canManageBilling={isOwner} />
              : <><ConversationTimeline messages={messages} channel={conversation.channel} retryingMessageId={retryingMessageId} hasOlder={hasOlder} loadingOlder={loadingOlder} onLoadOlder={onLoadOlder} onRetryMessage={onRetryMessage} />{locked ? <ConversationReplyNotice title="Replies are locked" description="Restore payment, upgrade your plan, or wait for quota reset before replying to this customer." action={isOwner ? <AppButton asChild size="sm"><a href="/settings/billing">View Billing</a></AppButton> : undefined} /> : !canReply && !closed ? <ConversationReplyNotice title="Replies are unavailable" description="You do not have permission to reply in this conversation." /> : <MessageComposer draft={draft} stagedKnowledgeAsset={stagedKnowledgeAsset} onDraftChange={onDraftChange} onClearStagedKnowledgeAsset={onClearStagedKnowledgeAsset} onSend={onSend} onEnd={onEnd} sending={sending} ending={ending} closed={closed} closedAt={conversation.closedAt} channel={conversation.channel} senderName={senderName} whatsappCanSend={whatsappCanSend} whatsappStatus={whatsappStatus} isOwner={isOwner} />}</>)}
            {tab === "tasks" && <AppEmptyState className="m-6 min-h-72 border-0 bg-transparent" icon={FileText} title="Tasks are coming later" description="The conversation workspace is prepared for a future task module." />}
            {tab === "activity" && <ActivityPanel activities={activities} />}
            {tab === "notes" && <NotesPanel notes={leadDetail?.lead.notes} saving={notesBusy} onSave={onNotes} />}
          </div>
          <div className={cn("grid h-full min-h-0 shrink-0 overflow-hidden transition-[grid-template-columns] duration-300 ease-out xl:grid", context ? "xl:grid-cols-[340px]" : "xl:grid-cols-[0px]")}>
            <div className="h-full min-h-0 min-w-0 overflow-hidden xl:w-[340px]">
              <ConversationContextDrawer active={renderedContext} open={Boolean(context)} onClose={() => setContext(null)} conversation={conversation} leadDetail={leadDetail} activities={activities} assigneeOptions={assigneeOptions} canManage={canAssign} canStageKnowledgeAssets={canStageKnowledgeAssets} knowledgeStageUnavailableReason={knowledgeStageUnavailableReason} statusBusy={statusBusy} assignBusy={assignBusy} notesBusy={notesBusy} onStageKnowledgeAsset={onStageKnowledgeAsset} onStatus={onStatus} onAssign={onAssign} onNotes={onNotes} />
            </div>
          </div>
          <ConversationRightRail active={context} onSelect={toggleContext} />
        </div>
      </section>
    </main>
  );
}
