"use client";

import { BookOpen, FileText, Folder, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { KnowledgeArticle, KnowledgeDocument } from "@/types/knowledge";
import { formatKnowledgeDate } from "./knowledge-hub-utils";

export type RecentKnowledgeItem =
  | { kind: "document"; item: KnowledgeDocument }
  | { kind: "article"; item: KnowledgeArticle };

function itemTitle(entry: RecentKnowledgeItem) {
  return entry.item.title;
}

function itemDate(entry: RecentKnowledgeItem) {
  return entry.item.updatedAt || entry.item.createdAt;
}

function Thumb({ entry }: { entry: RecentKnowledgeItem }) {
  const document = entry.kind === "document" ? entry.item : null;
  const extension = document?.fileExtension ?? document?.fileName?.split(".").pop()?.toLowerCase();
  const isImage = document?.mimeType?.includes("image");

  return (
    <div className="relative mx-auto h-24 w-40 overflow-hidden rounded-xl bg-gradient-to-b from-white to-slate-50 shadow-[0_18px_38px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
      <div className="flex h-5 items-center gap-1 border-b bg-white px-2">
        <span className="size-1.5 rounded-full bg-red-300" />
        <span className="size-1.5 rounded-full bg-amber-300" />
        <span className="size-1.5 rounded-full bg-emerald-300" />
      </div>
      <div className="flex h-[calc(100%-1.25rem)] items-center justify-center">
        {entry.kind === "article" ? (
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
            {entry.item.aiGenerated ? <Sparkles className="size-6" /> : <BookOpen className="size-6" />}
          </span>
        ) : isImage ? (
          <span className="grid size-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
            <FileText className="size-6" />
          </span>
        ) : (
          <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            {extension === "pdf" ? <FileText className="size-6" /> : <Folder className="size-6" />}
          </span>
        )}
      </div>
    </div>
  );
}

export function RecentDocumentsRow({
  items,
  loading,
  onSelect,
}: {
  items: RecentKnowledgeItem[];
  loading?: boolean;
  onSelect: (entry: RecentKnowledgeItem) => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold">Recent Documents</h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="mx-auto h-24 w-40 rounded-xl" />
            <Skeleton className="h-4 rounded-full" />
            <Skeleton className="mx-auto h-3 w-28 rounded-full" />
          </div>
        )) : items.length ? items.slice(0, 4).map((entry) => (
          <button
            key={`${entry.kind}-${entry.item.id}`}
            type="button"
            onClick={() => onSelect(entry)}
            className="group min-w-0 rounded-xl p-2 text-center transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Thumb entry={entry} />
            <p className="mx-auto mt-3 line-clamp-1 max-w-48 text-xs font-bold text-foreground">{itemTitle(entry)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Last update: {formatKnowledgeDate(itemDate(entry))}</p>
          </button>
        )) : (
          <div className="col-span-full rounded-xl border border-dashed bg-card p-8 text-center">
            <p className="text-sm font-bold">No recent knowledge yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Drop a document or create an article to start building your business knowledge.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function recentKnowledgeItems(documents: KnowledgeDocument[], articles: KnowledgeArticle[]): RecentKnowledgeItem[] {
  return [
    ...documents.map((item) => ({ kind: "document" as const, item })),
    ...articles.map((item) => ({ kind: "article" as const, item })),
  ].sort((a, b) => new Date(itemDate(b)).getTime() - new Date(itemDate(a)).getTime());
}
