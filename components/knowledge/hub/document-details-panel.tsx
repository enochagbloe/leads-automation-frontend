"use client";

import { AlertTriangle, Download, History, RefreshCcw, X } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppErrorState } from "@/components/app-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { KnowledgeDocument, KnowledgeDocumentVersion } from "@/types/knowledge";
import { DocumentLifecycleStatusBadge, DocumentProcessingStatusBadge } from "./document-status-badge";
import { formatBytes, formatKnowledgeDate, hasDocumentAction, titleCase, uploadedByName, versionNumber } from "./knowledge-hub-utils";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function VersionRow({ version }: { version: KnowledgeDocumentVersion }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">Version {version.versionNumber}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{version.originalFileName}</p>
        </div>
        {version.isActive && <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-primary">Active</span>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{formatBytes(version.fileSize)} · {version.mimeType} · {titleCase(version.processingStatus)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{formatKnowledgeDate(version.createdAt)}</p>
    </div>
  );
}

export function DocumentDetailsPanel({
  open,
  document,
  loading,
  error,
  versions,
  onClose,
  onDownload,
  onArchive,
  onRestore,
  onDelete,
  onRetry,
  pendingAction,
}: {
  open: boolean;
  document?: KnowledgeDocument;
  loading?: boolean;
  error?: unknown;
  versions: KnowledgeDocumentVersion[];
  onClose: () => void;
  onDownload: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onRetry: () => void;
  pendingAction?: string | null;
}) {
  if (!open) return null;
  const errorDescription = error instanceof Error ? error.message : "Try opening this document again.";

  return (
    <div className="fixed inset-0 z-[75] animate-[detail-overlay-in_160ms_ease-out] bg-foreground/25 backdrop-blur-[2px]" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close details overlay" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Knowledge document details"
        className="absolute bottom-4 right-4 top-4 flex w-[min(560px,calc(100%-2rem))] animate-[detail-panel-in_220ms_ease-out] flex-col overflow-hidden rounded-[1.35rem] border bg-card shadow-[0_24px_90px_rgba(20,35,27,0.24)]"
      >
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Document details</p>
            <h2 className="mt-1 truncate text-xl font-bold">{document?.title ?? "Loading document"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close details">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && <div className="space-y-3">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}</div>}
          {!loading && Boolean(error) && <AppErrorState title="Could not load document" description={errorDescription} />}
          {!loading && document && (
            <div className="space-y-6">
              <section>
                <div className="flex flex-wrap gap-2">
                  <DocumentProcessingStatusBadge status={document.processingStatus} />
                  <DocumentLifecycleStatusBadge status={document.status} />
                </div>
                {document.description && <p className="mt-4 rounded-2xl bg-muted/45 p-4 text-sm leading-6 text-muted-foreground">{document.description}</p>}
                {(document.processingError || document.processingErrorMessage) && (
                  <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                    <p className="font-bold"><AlertTriangle className="mr-1 inline size-4" />Processing error</p>
                    <p className="mt-1">{document.processingError?.message ?? document.processingErrorMessage}</p>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-bold">File information</h3>
                <dl className="mt-2 divide-y rounded-2xl border px-4">
                  <DetailRow label="Original file" value={document.originalFileName ?? document.fileName} />
                  <DetailRow label="File type" value={document.mimeType} />
                  <DetailRow label="File size" value={formatBytes(document.fileSize)} />
                  <DetailRow label="Version" value={`v${versionNumber(document)}`} />
                  <DetailRow label="Visibility" value={titleCase(document.visibility)} />
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-bold">Audit trail</h3>
                <dl className="mt-2 divide-y rounded-2xl border px-4">
                  <DetailRow label="Uploaded by" value={uploadedByName(document)} />
                  <DetailRow label="Uploaded" value={formatKnowledgeDate(document.createdAt)} />
                  <DetailRow label="Last updated" value={formatKnowledgeDate(document.updatedAt)} />
                  {document.archivedAt && <DetailRow label="Archived" value={formatKnowledgeDate(document.archivedAt)} />}
                </dl>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-bold"><History className="size-4" />Version history</h3>
                <div className="mt-3 space-y-2">
                  {(versions.length ? versions : document.versions ?? []).map((version) => <VersionRow key={version.id} version={version} />)}
                  {!versions.length && !document.versions?.length && <p className="rounded-xl border p-4 text-sm text-muted-foreground">No versions returned yet.</p>}
                </div>
              </section>
            </div>
          )}
        </div>

        {document && (
          <div className="flex flex-wrap justify-end gap-2 border-t bg-card px-5 py-4">
            {hasDocumentAction(document, "DOWNLOAD") && <AppButton variant="outline" onClick={onDownload} loading={pendingAction === "download"}><Download className="size-4" />Download</AppButton>}
            {hasDocumentAction(document, "RETRY_PROCESSING") && <AppButton variant="outline" onClick={onRetry} loading={pendingAction === "retry"}><RefreshCcw className="size-4" />Retry</AppButton>}
            {hasDocumentAction(document, "ARCHIVE") && <AppButton variant="outline" onClick={onArchive} loading={pendingAction === "archive"}>Archive</AppButton>}
            {hasDocumentAction(document, "RESTORE") && <AppButton variant="outline" onClick={onRestore} loading={pendingAction === "restore"}>Restore</AppButton>}
            {hasDocumentAction(document, "DELETE") && <AppButton variant="destructive" onClick={onDelete} loading={pendingAction === "delete"}>Delete</AppButton>}
          </div>
        )}
      </aside>
    </div>
  );
}
