"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Bot, FilePlus2, FolderPlus, Maximize2, MessageSquarePlus, Minimize2, PanelRightClose, PanelRightOpen, Plus, SendHorizontal, Target } from "lucide-react";
import type { KnowledgeArticle, KnowledgeDocument } from "@/types/knowledge";
import type { KnowledgeAssetRow } from "./all-knowledge-assets-table";
import { formatKnowledgeDate, titleCase } from "./knowledge-hub-utils";

type AgentMessage = {
  id: string;
  role: "agent" | "user";
  content: string;
  timestamp: string;
};

function selectedKey(selected?: KnowledgeAssetRow | null) {
  return selected ? `${selected.kind}-${selected.item.id}` : "new-chat";
}

function selectedTitle(selected?: KnowledgeAssetRow | null) {
  return selected?.item.title ?? "Knowledge assistant";
}

function selectedSummary(selected?: KnowledgeAssetRow | null) {
  if (!selected) return "Start a chat to review an article, ask for a summary, or plan a new knowledge asset.";
  if (selected.kind === "article") return selected.item.summary || selected.item.body.slice(0, 180) || "This article is ready for review.";
  return selected.item.description || selected.item.originalFileName || selected.item.fileName;
}

function selectedStatus(selected?: KnowledgeAssetRow | null) {
  if (!selected) return "New chat";
  if (selected.kind === "article") return `${titleCase(selected.item.status)} Article`;
  return `${titleCase(selected.item.processingStatus)} Document`;
}

function introMessage(selected?: KnowledgeAssetRow | null): AgentMessage {
  if (!selected) {
    return {
      id: "intro-new-chat",
      role: "agent",
      timestamp: "Now",
      content: "What would you like to create or improve in your knowledge base today?",
    };
  }

  if (selected.kind === "article") {
    return {
      id: `intro-article-${selected.item.id}`,
      role: "agent",
      timestamp: "Now",
      content: `I’m looking at “${selected.item.title}”. I can help summarize it, improve the wording, check if it is ready to publish, or suggest missing customer-facing details.`,
    };
  }

  const reviewHint = selected.item.processingStatus === "NEEDS_REVIEW"
    ? " It needs review before your team relies on it."
    : selected.item.processingStatus === "FAILED"
      ? " Processing failed, so review the error or retry processing first."
      : "";

  return {
    id: `intro-document-${selected.item.id}`,
    role: "agent",
    timestamp: "Now",
    content: `I’m looking at “${selected.item.title}”.${reviewHint} Ask me to summarize it, check whether it is client-sendable, or prepare notes for your team.`,
  };
}

function autoReply(selected: KnowledgeAssetRow | null | undefined, message: string) {
  const lower = message.toLowerCase();
  if (!selected) return "I can help. Give me the topic, service, or customer question you want this knowledge asset to cover.";
  if (lower.includes("summar")) return `Here’s the short version of “${selected.item.title}”: ${selectedSummary(selected)}`;
  if (lower.includes("publish") || lower.includes("ready")) {
    return selected.kind === "article"
      ? `This article is currently ${titleCase(selected.item.status)}. Review the body, visibility, tags, and customer sendability before publishing it.`
      : `This document is currently ${titleCase(selected.item.processingStatus)} and ${titleCase(selected.item.status)}. It should be used only after processing is complete.`;
  }
  if (lower.includes("customer") || lower.includes("send")) {
    return selected.kind === "article"
      ? "For customers, keep this article concise and make sure visibility is set to Client Sendable before using it in conversations."
      : "For customers, this document needs Client Sendable visibility and successful processing before it should be attached.";
  }
  return `Got it. I’ll use “${selected.item.title}” as the context for this chat.`;
}

function SelectedAssetCard({ selected }: { selected?: KnowledgeAssetRow | null }) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-bold">{selectedTitle(selected)}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <SendHorizontal className="size-3.5 text-amber-500" />
        {selectedStatus(selected)}
      </p>
    </div>
  );
}

export function KnowledgeAgentPanel({
  selected,
  open,
  expanded,
  onToggleOpen,
  onToggleExpanded,
}: {
  selected?: KnowledgeAssetRow | null;
  open: boolean;
  expanded: boolean;
  onToggleOpen: () => void;
  onToggleExpanded: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const [threads, setThreads] = useState<Record<string, AgentMessage[]>>({});
  const currentKey = selectedKey(selected);
  const currentThread = useMemo(() => threads[currentKey] ?? [], [currentKey, threads]);
  const messages = useMemo(() => [introMessage(selected), ...currentThread], [currentThread, selected]);

  useEffect(() => {
    if (!addMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) setAddMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [addMenuOpen]);

  const startNewChat = () => {
    setDraft("");
    setThreads((current) => ({ ...current, [currentKey]: [] }));
  };

  const sendMessage = () => {
    const content = draft.trim();
    if (!content) return;
    const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setThreads((current) => ({
      ...current,
      [currentKey]: [
        ...(current[currentKey] ?? []),
        { id: `${Date.now()}-user`, role: "user", content, timestamp: now },
        { id: `${Date.now()}-agent`, role: "agent", content: autoReply(selected, content), timestamp: now },
      ],
    }));
    setDraft("");
  };

  return (
    <aside className="hidden h-full min-h-0 min-w-0 border-l bg-card lg:flex">
      {!open && (
        <div className="flex h-full w-full flex-col items-center border-l bg-card px-2 py-5">
          <button
            type="button"
            onClick={onToggleOpen}
            className="grid size-10 place-items-center rounded-full border bg-background text-primary shadow-sm transition-colors hover:bg-secondary"
            aria-label="Open AI assistant"
          >
            <PanelRightOpen className="size-4" />
          </button>
          <div className="mt-5 grid size-10 place-items-center rounded-2xl bg-secondary text-primary">
            <Bot className="size-4" />
          </div>
          <p className="mt-10 origin-center rotate-90 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            AI chat
          </p>
        </div>
      )}
      {open && (
      <div className="relative flex min-h-0 w-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-36 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">{selectedTitle(selected)}</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{selectedSummary(selected)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={startNewChat}
                className="grid size-9 place-items-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Start new knowledge chat"
              >
                <MessageSquarePlus className="size-4" />
              </button>
              <button
                type="button"
                onClick={onToggleExpanded}
                className="grid size-9 place-items-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-foreground"
                aria-label={expanded ? "Shrink AI assistant" : "Expand AI assistant"}
              >
                {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
              <button
                type="button"
                onClick={onToggleOpen}
                className="grid size-9 place-items-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close AI assistant"
              >
                <PanelRightClose className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-5">
            <SelectedAssetCard selected={selected} />
          </div>

          {selected && (
            <div className="mt-4 rounded-xl border bg-muted/25 p-3 text-xs leading-5 text-muted-foreground">
              <p className="font-bold text-foreground">Asset context</p>
              <p className="mt-1">Updated {formatKnowledgeDate(selected.item.updatedAt)}</p>
              {selected.kind === "article" && <p>Source: {titleCase((selected.item as KnowledgeArticle).source)}</p>}
              {selected.kind === "document" && <p>File: {(selected.item as KnowledgeDocument).fileName}</p>}
            </div>
          )}

          <div className="mt-5 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex items-start gap-3"}>
                {message.role === "agent" && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                    <Bot className="size-4" />
                  </span>
                )}
                <div className={message.role === "user"
                  ? "max-w-[90%] rounded-2xl bg-primary px-3.5 py-2.5 text-sm leading-6 text-primary-foreground"
                  : "max-w-[90%] rounded-2xl bg-muted/55 px-3.5 py-2.5 text-sm leading-6 text-foreground"}
                >
                  {message.role === "agent" && <p className="mb-1 text-[11px] font-bold text-muted-foreground">Knowledge agent · {message.timestamp}</p>}
                  <p>{message.content}</p>
                  {message.role === "user" && <p className="mt-1 text-right text-[10px] text-primary-foreground/70">{message.timestamp}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div ref={addMenuRef} className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/90 to-transparent p-4 pt-16">
          {addMenuOpen && (
            <div className="pointer-events-auto absolute inset-x-4 bottom-[6.25rem] z-20 overflow-hidden rounded-2xl border bg-white/95 p-2 text-foreground shadow-[0_22px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl">
              <p className="px-2 pb-1 text-[11px] text-muted-foreground">Add</p>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg bg-muted px-2 py-2 text-left text-sm transition-colors hover:bg-secondary"
                onClick={() => setAddMenuOpen(false)}
              >
                <FolderPlus className="size-4 text-muted-foreground" />
                <span className="font-medium">Files and folders</span>
              </button>
              <button
                type="button"
                className="mt-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setAddMenuOpen(false)}
              >
                <Target className="size-4 text-muted-foreground" />
                <span className="font-medium">Goal</span>
                <span className="truncate text-xs text-muted-foreground/75">Set a goal to keep this chat focused</span>
              </button>
              <p className="px-2 pb-1 pt-3 text-[11px] text-muted-foreground">Knowledge</p>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setAddMenuOpen(false)}
              >
                <FilePlus2 className="size-4 text-muted-foreground" />
                <span className="font-medium">Current document</span>
                <span className="truncate text-xs text-muted-foreground/75">Use selected asset as context</span>
              </button>
            </div>
          )}
          <div className="pointer-events-auto flex min-h-16 items-end gap-2 rounded-2xl border bg-white/82 p-2.5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setAddMenuOpen((current) => !current)}
              className="mb-1 grid size-8 shrink-0 place-items-center rounded-full bg-white text-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-muted"
              aria-label="Open add menu"
              aria-expanded={addMenuOpen}
            >
              <Plus className="size-4" />
            </button>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              className="min-h-11 flex-1 resize-none border-0 bg-transparent px-0 py-2 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0"
              placeholder={selected ? "Ask about this asset" : "Start a new knowledge chat"}
            />
            <button
              type="button"
              onClick={sendMessage}
              className="mb-1 grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background disabled:opacity-45"
              disabled={!draft.trim()}
              aria-label="Send knowledge message"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
      </div>
      )}
    </aside>
  );
}
