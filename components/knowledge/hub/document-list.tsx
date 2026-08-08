"use client";

import { FileArchive, FileImage, FileSpreadsheet, FileText, FileType2 } from "lucide-react";
import { AppEmptyState } from "@/components/app-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KnowledgeDocument } from "@/types/knowledge";
import { DocumentActionsMenu } from "./document-actions-menu";
import { DocumentLifecycleStatusBadge, DocumentProcessingStatusBadge } from "./document-status-badge";
import { formatBytes, formatKnowledgeDate, titleCase, uploadedByName, versionNumber } from "./knowledge-hub-utils";

function FileIcon({ mimeType, fileName }: { mimeType?: string | null; fileName?: string | null }) {
  const value = `${mimeType ?? ""} ${fileName ?? ""}`.toLowerCase();
  if (value.includes("image")) return <FileImage className="size-5" />;
  if (value.includes("sheet") || value.includes("csv") || value.includes("xlsx")) return <FileSpreadsheet className="size-5" />;
  if (value.includes("zip")) return <FileArchive className="size-5" />;
  if (value.includes("pdf") || value.includes("doc") || value.includes("text")) return <FileText className="size-5" />;
  return <FileType2 className="size-5" />;
}

export function DocumentList({
  documents,
  loading,
  onSelect,
  onDownload,
  onArchive,
  onRestore,
  onDelete,
  onRetry,
}: {
  documents: KnowledgeDocument[];
  loading?: boolean;
  onSelect: (document: KnowledgeDocument) => void;
  onDownload: (document: KnowledgeDocument) => void;
  onArchive: (document: KnowledgeDocument) => void;
  onRestore: (document: KnowledgeDocument) => void;
  onDelete: (document: KnowledgeDocument) => void;
  onRetry: (document: KnowledgeDocument) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border bg-card">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="border-b p-4 last:border-b-0">
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!documents.length) {
    return (
      <div className="rounded-2xl border bg-card p-10">
        <AppEmptyState icon={FileText} title="No documents found" description="Upload business documents or clear the current filters." />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="hidden grid-cols-[minmax(260px,1.4fr)_140px_135px_130px_130px_56px] gap-4 border-b bg-muted/35 px-4 py-3 text-xs font-bold text-muted-foreground lg:grid">
        <span>Name</span>
        <span>Processing</span>
        <span>Status</span>
        <span>Uploaded by</span>
        <span>Updated</span>
        <span />
      </div>
      <div className="divide-y">
        {documents.map((document) => (
          <article
            key={document.id}
            className={cn("grid gap-4 p-4 transition-colors hover:bg-muted/30 lg:grid-cols-[minmax(260px,1.4fr)_140px_135px_130px_130px_56px] lg:items-center")}
          >
            <button type="button" onClick={() => onSelect(document)} className="flex min-w-0 cursor-pointer items-start gap-3 text-left">
              <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <FileIcon mimeType={document.mimeType} fileName={document.fileName} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-foreground">{document.title}</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{document.originalFileName ?? document.fileName}</span>
                <span className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                  <span>{formatBytes(document.fileSize)}</span>
                  <span>v{versionNumber(document)}</span>
                  {document.category && <span>{document.category}</span>}
                  <span>{titleCase(document.visibility)}</span>
                </span>
              </span>
            </button>

            <div><DocumentProcessingStatusBadge status={document.processingStatus} /></div>
            <div><DocumentLifecycleStatusBadge status={document.status} /></div>
            <div className="text-xs font-semibold text-muted-foreground">{uploadedByName(document)}</div>
            <div className="text-xs text-muted-foreground">{formatKnowledgeDate(document.updatedAt)}</div>
            <div className="flex justify-end">
              <DocumentActionsMenu
                document={document}
                onView={() => onSelect(document)}
                onDownload={() => onDownload(document)}
                onArchive={() => onArchive(document)}
                onRestore={() => onRestore(document)}
                onDelete={() => onDelete(document)}
                onRetry={() => onRetry(document)}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
