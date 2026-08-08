"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2, Circle, Clock3, FileText, Folder, MoreHorizontal, Sparkles } from "lucide-react";
import { FiFileText } from "react-icons/fi";
import { AppButton } from "@/components/app-button";
import { AppEmptyState } from "@/components/app-empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KnowledgeArticle, KnowledgeDocument } from "@/types/knowledge";
import { formatKnowledgeDate, titleCase } from "./knowledge-hub-utils";

export type KnowledgeAssetRow =
  | { kind: "document"; item: KnowledgeDocument }
  | { kind: "article"; item: KnowledgeArticle };

function rowDate(row: KnowledgeAssetRow) {
  return row.item.createdAt;
}

function rowUpdated(row: KnowledgeAssetRow) {
  return row.item.updatedAt || row.item.createdAt;
}

function rowSource(row: KnowledgeAssetRow) {
  if (row.kind === "article") {
    if (row.item.source === "AI_DRAFT") return "AI Knowledge";
    if (row.item.source === "IMPORTED") return "Imported";
    return "Article";
  }
  if (row.item.originalFileName?.toLowerCase().endsWith(".pdf") || row.item.fileName.toLowerCase().endsWith(".pdf")) return "PDF";
  return row.item.fileExtension ? row.item.fileExtension.toUpperCase() : "Upload";
}

function rowStatus(row: KnowledgeAssetRow) {
  if (row.kind === "article") return row.item.status;
  if (row.item.processingStatus === "NEEDS_REVIEW") return "NEEDS_REVIEW";
  if (row.item.processingStatus === "FAILED") return "FAILED";
  return row.item.status;
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const style = normalized === "PUBLISHED" || normalized === "ACTIVE" || normalized === "READY"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : normalized === "NEEDS_REVIEW" || normalized === "DRAFT"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : normalized === "FAILED" || normalized === "ARCHIVED"
        ? "border-slate-200 bg-slate-50 text-slate-600"
        : "border-primary/20 bg-secondary text-primary";
  const Icon = normalized === "PUBLISHED" || normalized === "ACTIVE" || normalized === "READY" ? CheckCircle2 : normalized === "NEEDS_REVIEW" ? Clock3 : Circle;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold", style)}>
      <Icon className="size-3" />
      {titleCase(status)}
    </span>
  );
}

function SourceBadge({ row }: { row: KnowledgeAssetRow }) {
  const Icon = row.kind === "article" ? row.item.aiGenerated ? Sparkles : BookOpen : FileText;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <Icon className="size-3.5 text-muted-foreground" />
      {rowSource(row)}
    </span>
  );
}

function AssetActions({
  row,
  canManage,
  onOpen,
  onPublish,
  onArchiveArticle,
  onDownload,
  onArchiveDocument,
  onRetry,
}: {
  row: KnowledgeAssetRow;
  canManage: boolean;
  onOpen: () => void;
  onPublish: () => void;
  onArchiveArticle: () => void;
  onDownload: () => void;
  onArchiveDocument: () => void;
  onRetry: () => void;
}) {
  const [open, setOpen] = useState(false);
  const runAction = (action: () => void) => {
    setOpen(false);
    window.setTimeout(action, 0);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <AppButton size="icon" variant="ghost" aria-label="Knowledge asset actions">
          <MoreHorizontal className="size-4" />
        </AppButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => runAction(onOpen)}>
          {row.kind === "article" ? "Open editor" : "View details"}
        </button>
        {row.kind === "document" && (
          <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => runAction(onDownload)}>Download</button>
        )}
        {canManage && row.kind === "article" && row.item.status !== "PUBLISHED" && row.item.status !== "ARCHIVED" && (
          <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => runAction(onPublish)}>Publish</button>
        )}
        {canManage && row.kind === "article" && row.item.status !== "ARCHIVED" && (
          <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => runAction(onArchiveArticle)}>Archive</button>
        )}
        {canManage && row.kind === "document" && row.item.processingStatus === "FAILED" && (
          <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => runAction(onRetry)}>Retry processing</button>
        )}
        {canManage && row.kind === "document" && row.item.status !== "ARCHIVED" && (
          <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-muted" onClick={() => runAction(onArchiveDocument)}>Archive</button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function AllKnowledgeAssetsTable({
  rows,
  loading,
  canManage,
  onSelect,
  onOpenArticle,
  onPublishArticle,
  onArchiveArticle,
  onOpenDocument,
  onDownloadDocument,
  onArchiveDocument,
  onRetryDocument,
}: {
  rows: KnowledgeAssetRow[];
  loading?: boolean;
  canManage: boolean;
  onSelect: (row: KnowledgeAssetRow) => void;
  onOpenArticle: (article: KnowledgeArticle) => void;
  onPublishArticle: (article: KnowledgeArticle) => void;
  onArchiveArticle: (article: KnowledgeArticle) => void;
  onOpenDocument: (document: KnowledgeDocument) => void;
  onDownloadDocument: (document: KnowledgeDocument) => void;
  onArchiveDocument: (document: KnowledgeDocument) => void;
  onRetryDocument: (document: KnowledgeDocument) => void;
}) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="border-b px-4 py-3 last:border-b-0">
            <Skeleton className="h-8 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl border bg-card p-10">
        <AppEmptyState icon={Folder} title="No knowledge assets found" description="Drop files into this page or create an article to build your knowledge base." />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-[minmax(260px,1.6fr)_150px_120px_120px_112px_44px] gap-4 bg-muted/30 px-4 py-2.5 text-[11px] font-medium text-muted-foreground">
        <span>Name</span>
        <span>Source</span>
        <span>Added</span>
        <span>Last opened</span>
        <span>Status</span>
        <span />
      </div>
      <div className="divide-y">
        {rows.map((row) => {
          const isArticle = row.kind === "article";
          const article = isArticle ? row.item : null;
          const document = row.kind === "document" ? row.item : null;
          return (
            <div key={`${row.kind}-${row.item.id}`} className="grid grid-cols-[minmax(260px,1.6fr)_150px_120px_120px_112px_44px] items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/25">
              <button type="button" onClick={() => onSelect(row)} className="flex min-w-0 items-center gap-2 text-left">
                <FiFileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-semibold">{row.item.title}</span>
              </button>
              <SourceBadge row={row} />
              <span className="text-xs font-semibold">{formatKnowledgeDate(rowDate(row)).split(",")[0]}</span>
              <span className="text-xs text-muted-foreground">{formatKnowledgeDate(rowUpdated(row)).split(",").slice(1).join(",").trim() || "Recently"}</span>
              <StatusPill status={rowStatus(row)} />
              <AssetActions
                row={row}
                canManage={canManage}
                onOpen={() => {
                  if (article) onOpenArticle(article);
                  if (document) onOpenDocument(document);
                }}
                onPublish={() => article && onPublishArticle(article)}
                onArchiveArticle={() => article && onArchiveArticle(article)}
                onDownload={() => document && onDownloadDocument(document)}
                onArchiveDocument={() => document && onArchiveDocument(document)}
                onRetry={() => document && onRetryDocument(document)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function createKnowledgeAssetRows(documents: KnowledgeDocument[], articles: KnowledgeArticle[]): KnowledgeAssetRow[] {
  return [
    ...documents.map((item) => ({ kind: "document" as const, item })),
    ...articles.map((item) => ({ kind: "article" as const, item })),
  ].sort((a, b) => new Date(rowUpdated(b)).getTime() - new Date(rowUpdated(a)).getTime());
}
