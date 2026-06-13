"use client";

import {
  Activity,
  ArrowLeft,
  BookOpen,
  Bot,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CircleUserRound,
  ExternalLink,
  FileText,
  Filter,
  Link2,
  MessageCircleMore,
  MessageSquareText,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  TriangleAlert,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app-button";
import { AppEmptyState } from "@/components/app-empty-state";
import { AppSelect, type AppSelectOption } from "@/components/app-select";
import { ConversationComposer, type Macro } from "@/components/conversations/composer/conversation-composer";
import { ConversationStatusBadge } from "@/components/conversations/conversation-status-badge";
import { RealtimeStatusIndicator } from "@/components/conversations/realtime-status-indicator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ACTIVE_CONVERSATION_STATUSES, CONVERSATION_CHANNEL_LABELS, CONVERSATION_PRIORITIES, CONVERSATION_PRIORITY_LABELS, CONVERSATION_STATUS_LABELS, conversationPriorityTone, formatConversationDateTime, formatMessageTime } from "@/lib/conversations";
import { formatLeadDate, getLeadActivityLabel, LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, leadStatusTone } from "@/lib/leads";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationMessage, ConversationStatus, UpdateConversationInput } from "@/types/conversation";
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

const ARTICLES: Article[] = [
  { id: "1", title: "Preparing for a property viewing", summary: "A practical checklist customers can use before attending a scheduled property viewing.", source: "BizReply Help", url: "#", tag: "Guideline", readTime: "4 min read", visibility: "Public", frequency: "FAQ" },
  { id: "2", title: "How appointment scheduling works", summary: "What customers should expect after requesting a meeting or site visit.", source: "BizReply Help", url: "#", tag: "Setup", readTime: "3 min read", visibility: "Public", frequency: "FAQ" },
  { id: "3", title: "Updating contact information", summary: "Steps for correcting a phone number or notification email.", source: "Internal guide", url: "#", tag: "Setup", readTime: "2 min read", visibility: "Private", frequency: "Rarely Asked" },
];

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
    <article className={cn("group mb-6 flex gap-3", outbound && "flex-row-reverse")}>
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

function MessageComposer({ draft, onDraftChange, onSend, onEnd, sending, ending, closed, closedAt, channel, senderName, whatsappCanSend, whatsappStatus, isOwner }: { draft: string; onDraftChange: (value: string) => void; onSend: () => void; onEnd: () => void; sending: boolean; ending: boolean; closed: boolean; closedAt: string | null; channel: Conversation["channel"]; senderName: string; whatsappCanSend: boolean; whatsappStatus?: string; isOwner: boolean }) {
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
    return <div className="border-t bg-card px-4 py-3"><div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3"><div><p className="text-sm font-semibold">This conversation is closed</p><p className="text-xs leading-5 text-muted-foreground">{closedAt ? `Closed ${formatConversationDateTime(closedAt)}. ` : ""}If the customer replies again, BizReply will automatically reopen it.</p></div></div></div>;
  }

  const whatsAppBlocked = channel === "WHATSAPP" && !whatsappCanSend;
  const blockedMessage = whatsappStatus === "DEACTIVATED"
    ? "WhatsApp has been deactivated for this business. Reconnect or change the number to send replies."
    : whatsappStatus === "ERROR"
      ? "This WhatsApp connection needs to be reconnected before messages can be sent."
      : "WhatsApp is not connected for this business. Connect WhatsApp in Settings before sending replies.";

  return (
    <div className="border-t bg-card px-3 py-3 sm:px-6">
      <div className="relative mx-auto max-w-4xl">
        {whatsAppBlocked && <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-muted-foreground"><span>{blockedMessage}</span>{isOwner ? <a href="/settings/business/whatsapp" className="font-semibold text-primary underline underline-offset-4">Go to WhatsApp Settings</a> : <span className="font-semibold">Ask the business owner to reconnect WhatsApp.</span>}</div>}
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
        <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">{channel === "WHATSAPP" ? "Replies are sent through the connected WhatsApp provider." : "Stored in BizReply only."}</p>
      </div>
    </div>
  );
}

function ArticleFilterPopover({ open, onOpenChange, visibility, onVisibilityChange, frequency, onFrequencyChange, tags, onTagsChange }: { open: boolean; onOpenChange: (open: boolean) => void; visibility: string; onVisibilityChange: (value: string) => void; frequency: string; onFrequencyChange: (value: string) => void; tags: string[]; onTagsChange: (tags: string[]) => void }) {
  if (!open) return null;
  const availableTags = ["Payment", "Setup", "Website", "Error", "Guideline"];
  return (
    <div className="absolute right-12 top-14 z-20 w-[min(300px,calc(100vw-2rem))] rounded-xl border bg-popover p-4 shadow-[0_18px_50px_rgba(20,35,27,0.18)]">
      <div className="flex items-center justify-between"><p className="text-sm font-bold">Article filters</p><button type="button" className="text-xs font-semibold text-primary" onClick={() => { onVisibilityChange("ALL"); onFrequencyChange("ALL"); onTagsChange([]); }}>Reset</button></div>
      <label className="mt-4 block text-xs font-semibold">Visibility</label>
      <AppSelect className="mt-1" value={visibility} onValueChange={onVisibilityChange} options={[{ value: "ALL", label: "Public and private" }, { value: "PUBLIC", label: "Public" }, { value: "PRIVATE", label: "Private" }]} />
      <label className="mt-4 block text-xs font-semibold">Frequency</label>
      <AppSelect className="mt-1" value={frequency} onValueChange={onFrequencyChange} options={[{ value: "ALL", label: "All frequencies" }, { value: "FAQ", label: "Frequently asked" }, { value: "RARE", label: "Rarely asked" }]} />
      <p className="mt-4 text-xs font-semibold">Tags</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{availableTags.map((tag) => <button type="button" key={tag} onClick={() => onTagsChange(tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag])} className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors", tags.includes(tag) ? "border-primary bg-secondary text-primary" : "bg-card text-muted-foreground hover:bg-muted")}>{tag}</button>)}</div>
      <AppButton className="mt-5 w-full" size="sm" onClick={() => onOpenChange(false)}>Apply filters</AppButton>
    </div>
  );
}

function KnowledgeBaseDrawer({ onSuggest }: { onSuggest: (article: Article) => void }) {
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [visibility, setVisibility] = useState("ALL");
  const [frequency, setFrequency] = useState("ALL");
  const [tags, setTags] = useState<string[]>([]);
  const articles = ARTICLES.filter((article) => {
    const matchesQuery = `${article.title} ${article.summary} ${article.tag}`.toLowerCase().includes(query.toLowerCase());
    const matchesVisibility = visibility === "ALL" || article.visibility === visibility;
    const matchesFrequency = frequency === "ALL" || article.frequency === frequency;
    const matchesTags = tags.length === 0 || tags.includes(article.tag);
    return matchesQuery && matchesVisibility && matchesFrequency && matchesTags;
  });
  if (selectedArticle) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b p-4"><AppButton size="icon" variant="ghost" aria-label="Back to article list" onClick={() => setSelectedArticle(null)}><ArrowLeft className="size-4" /></AppButton><div><h3 className="font-bold">Article preview</h3><p className="text-xs text-muted-foreground">Review before adding it to your reply.</p></div></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid aspect-[16/9] place-items-center rounded-xl bg-secondary text-primary"><BookOpen className="size-10" /></div>
          <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><span className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">{selectedArticle.tag}</span><span>{selectedArticle.readTime}</span></div>
          <h4 className="mt-4 text-xl font-bold">{selectedArticle.title}</h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedArticle.summary}</p>
          <div className="mt-6 grid gap-2"><AppButton onClick={() => onSuggest(selectedArticle)}><Plus className="size-4" />Add to reply draft</AppButton><AppButton variant="outline" disabled title="Article editing is coming later">Edit article <span className="text-[10px]">(soon)</span></AppButton></div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex h-full flex-col">
      <div className="border-b p-4">
        <h3 className="font-bold">Knowledge Base</h3>
        <p className="mt-1 text-xs text-muted-foreground">Find a helpful article without leaving the conversation.</p>
        <div className="mt-4 flex gap-2">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search articles</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Search articles" /></label>
          <AppButton size="icon" variant={filterOpen ? "secondary" : "outline"} aria-label="Filter articles" aria-expanded={filterOpen} onClick={() => setFilterOpen((value) => !value)}><Filter className="size-4" /></AppButton>
          <AppButton size="icon" variant="outline" aria-label="Create article coming soon" title="Article creation coming soon" disabled><Plus className="size-4" /></AppButton>
        </div>
      </div>
      <ArticleFilterPopover open={filterOpen} onOpenChange={setFilterOpen} visibility={visibility} onVisibilityChange={setVisibility} frequency={frequency} onFrequencyChange={setFrequency} tags={tags} onTagsChange={setTags} />
      <div className="min-h-0 flex-1 divide-y overflow-y-auto">
        {articles.map((article) => (
          <article key={article.id} className="p-4">
            <button type="button" className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelectedArticle(article)}><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><BookOpen className="size-4" /></span><span className="min-w-0"><span className="block font-semibold">{article.title}</span><span className="mt-1 block text-[11px] text-muted-foreground">{article.tag} · {article.readTime}</span></span></button>
            <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{article.summary}</p>
            <button type="button" className="mt-3 text-xs font-bold text-primary hover:underline" onClick={() => onSuggest(article)}>Suggest article</button>
          </article>
        ))}
        {articles.length === 0 && <AppEmptyState className="m-4 min-h-52 border-0" icon={BookOpen} title="No articles found" description="Try a different search phrase." />}
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
    toast.info("Internal chat is a local placeholder for now.");
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
  const lead = leadDetail?.lead;
  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b p-5"><span className="grid size-14 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">{initials(conversation.lead.fullName)}</span><h3 className="mt-3 text-lg font-bold">{conversation.lead.fullName}</h3><p className="mt-1 text-sm text-muted-foreground">{conversation.lead.email ?? conversation.lead.phone}</p></div>
      <div className="space-y-6 p-5">
        <section><h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Conversation</h4><div className="mt-3 space-y-3"><div><label htmlFor="drawer-status" className="mb-1 block text-xs font-semibold">Status</label>{conversation.status === "CLOSED" ? <ConversationStatusBadge status="CLOSED" /> : <AppSelect id="drawer-status" value={conversation.status} options={ACTIVE_CONVERSATION_STATUSES.map((status) => ({ value: status, label: CONVERSATION_STATUS_LABELS[status] }))} disabled={statusBusy} onValueChange={(value) => onStatus(value as ConversationStatus)} />}</div>{canManage && <div><label htmlFor="drawer-assignee" className="mb-1 block text-xs font-semibold">Assigned staff</label><AppSelect id="drawer-assignee" value={conversation.assignedStaffId ?? "__unassigned"} options={assigneeOptions} disabled={assignBusy} onValueChange={(value) => onAssign(value === "__unassigned" ? null : value)} /></div>}</div></section>
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

function ConversationContextDrawer({ active, open, onClose, conversation, leadDetail, activities, assigneeOptions, canManage, statusBusy, assignBusy, notesBusy, onStatus, onAssign, onNotes, onSuggest }: { active: ContextPanel; open: boolean; onClose: () => void; conversation: Conversation; leadDetail?: LeadDetailResponse; activities: LeadActivity[]; assigneeOptions: AppSelectOption[]; canManage: boolean; statusBusy: boolean; assignBusy: boolean; notesBusy: boolean; onStatus: (status: ConversationStatus) => void; onAssign: (id: string | null) => void; onNotes: (notes: string | null) => void; onSuggest: (article: Article) => void }) {
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
        {active === "knowledge" && <KnowledgeBaseDrawer onSuggest={onSuggest} />}
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
  draft,
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
  draft: string;
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

  const toggleContext = (panel: ContextPanel) => {
    if (context === panel) {
      setContext(null);
      return;
    }
    setRenderedContext(panel);
    setContext(panel);
  };

  const suggestArticle = (article: Article) => {
    onDraftChange(`${article.title}\n${article.url === "#" ? "Article suggestion will be connected later." : article.url}`);
    toast.info("Article added to the reply draft", { description: "Suggestion delivery will be connected later." });
    setContext(null);
  };

  return (
    <main className="flex h-[calc(100dvh-4rem)] min-h-[620px] overflow-hidden bg-background">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 shrink-0 items-center gap-2 border-b bg-card px-3 sm:px-4">
          <AppButton size="icon" variant="ghost" aria-label="Back to inbox" title="Back to inbox" onClick={onBack}><ArrowLeft className="size-4" /></AppButton>
          <div className="hidden items-center gap-1 sm:flex"><AppButton size="icon" variant="ghost" className="size-9 min-h-9" aria-label="Previous conversation" disabled={!hasPrevious} onClick={onPrevious}><ChevronLeft className="size-4" /></AppButton><AppButton size="icon" variant="ghost" className="size-9 min-h-9" aria-label="Next conversation" disabled={!hasNext} onClick={onNext}><ChevronRight className="size-4" /></AppButton></div>
          <div className="min-w-0 flex-1 sm:ml-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-xs font-bold text-primary">{conversation.displayId}</span>
              {editingSubject
                ? <form className="flex min-w-0 flex-1 items-center gap-1" onSubmit={(event) => { event.preventDefault(); onUpdate({ subject: subject.trim() || null }); setEditingSubject(false); }}><label className="sr-only" htmlFor="conversation-subject">Conversation subject</label><input id="conversation-subject" autoFocus value={subject} onChange={(event) => setSubject(event.target.value)} className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring" /><AppButton type="submit" size="sm" className="h-8 min-h-8" loading={updateBusy}>Save</AppButton><AppButton type="button" size="sm" variant="ghost" className="h-8 min-h-8" onClick={() => { setSubject(conversation.subject ?? ""); setEditingSubject(false); }}>Cancel</AppButton></form>
                : <><h1 className="truncate text-sm font-bold sm:text-base">{conversation.subject ?? conversation.lead.fullName}</h1>{canManage && <AppButton size="icon" variant="ghost" className="size-8 min-h-8 shrink-0" aria-label="Edit conversation subject" onClick={() => setEditingSubject(true)}><Pencil className="size-3.5" /></AppButton>}</>}
            </div>
            <p className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-muted-foreground"><span className="truncate">{conversation.lead.fullName} · {CONVERSATION_CHANNEL_LABELS[conversation.channel]} channel</span><span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold", conversationPriorityTone(conversation.priority))}>{CONVERSATION_PRIORITY_LABELS[conversation.priority]}</span></p>
          </div>
          <RealtimeStatusIndicator className="hidden sm:inline-flex" />
          <AppButton size="icon" variant={conversation.pinned ? "secondary" : "ghost"} className="shrink-0" loading={updateBusy} aria-label={conversation.pinned ? "Unpin conversation" : "Pin conversation"} aria-pressed={conversation.pinned} onClick={() => onUpdate({ pinned: !conversation.pinned })}>{conversation.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}</AppButton>
          {canManage && <div className="hidden w-32 xl:block"><AppSelect aria-label="Conversation priority" value={conversation.priority} options={CONVERSATION_PRIORITIES.map((priority) => ({ value: priority, label: CONVERSATION_PRIORITY_LABELS[priority] }))} disabled={updateBusy} onValueChange={(priority) => onUpdate({ priority: priority as Conversation["priority"] })} /></div>}
          {conversation.status === "CLOSED"
            ? <ConversationStatusBadge status="CLOSED" />
            : <div className="hidden w-44 lg:block"><AppSelect aria-label="Conversation status" value={conversation.status} options={ACTIVE_CONVERSATION_STATUSES.map((status) => ({ value: status, label: CONVERSATION_STATUS_LABELS[status] }))} disabled={statusBusy} onValueChange={(value) => onStatus(value as ConversationStatus)} /></div>}
          <AppButton size="icon" variant="ghost" aria-label="Open lead profile" className="md:hidden" onClick={() => toggleContext("profile")}><CircleUserRound className="size-4" /></AppButton>
          {canManage && <ConfirmDialog trigger={<AppButton size="icon" variant="ghost" aria-label="Delete conversation" title="Delete conversation"><MoreHorizontal className="size-4" /></AppButton>} title="Delete this conversation?" description="The conversation will disappear from this business inbox." confirmLabel="Delete conversation" loading={deleting} onConfirm={onDelete} />}
          {conversation.status !== "CLOSED" && <ConfirmDialog trigger={<AppButton size="sm" className="hidden sm:inline-flex">End Chat</AppButton>} title="End this conversation?" description="The conversation will be closed. If the customer replies later, BizReply will automatically reopen it." confirmLabel="End Chat" loading={ending} onConfirm={onEnd} />}
        </header>

        <ConversationTabs active={tab} onChange={setTab} activityCount={activities.length} />
        <div className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-1.5 md:hidden" aria-label="Conversation context tools">
          {RAIL_ITEMS.map(({ id, label, icon: Icon }) => <AppButton key={id} size="sm" variant={context === id ? "secondary" : "ghost"} className="shrink-0" aria-pressed={context === id} onClick={() => toggleContext(id)}><Icon className="size-4" />{label}</AppButton>)}
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            {tab === "conversation" && <><ConversationTimeline messages={messages} channel={conversation.channel} retryingMessageId={retryingMessageId} hasOlder={hasOlder} loadingOlder={loadingOlder} onLoadOlder={onLoadOlder} onRetryMessage={onRetryMessage} /><MessageComposer draft={draft} onDraftChange={onDraftChange} onSend={onSend} onEnd={onEnd} sending={sending} ending={ending} closed={conversation.status === "CLOSED"} closedAt={conversation.closedAt} channel={conversation.channel} senderName={senderName} whatsappCanSend={whatsappCanSend} whatsappStatus={whatsappStatus} isOwner={isOwner} /></>}
            {tab === "tasks" && <AppEmptyState className="m-6 min-h-72 border-0 bg-transparent" icon={FileText} title="Tasks are coming later" description="The conversation workspace is prepared for a future task module." />}
            {tab === "activity" && <ActivityPanel activities={activities} />}
            {tab === "notes" && <NotesPanel notes={leadDetail?.lead.notes} saving={notesBusy} onSave={onNotes} />}
          </div>
          <div className={cn("grid h-full min-h-0 shrink-0 overflow-hidden transition-[grid-template-columns] duration-300 ease-out xl:grid", context ? "xl:grid-cols-[340px]" : "xl:grid-cols-[0px]")}>
            <div className="h-full min-h-0 min-w-0 overflow-hidden xl:w-[340px]">
              <ConversationContextDrawer active={renderedContext} open={Boolean(context)} onClose={() => setContext(null)} conversation={conversation} leadDetail={leadDetail} activities={activities} assigneeOptions={assigneeOptions} canManage={canManage} statusBusy={statusBusy} assignBusy={assignBusy} notesBusy={notesBusy} onStatus={onStatus} onAssign={onAssign} onNotes={onNotes} onSuggest={suggestArticle} />
            </div>
          </div>
          <ConversationRightRail active={context} onSelect={toggleContext} />
        </div>
      </section>
    </main>
  );
}
