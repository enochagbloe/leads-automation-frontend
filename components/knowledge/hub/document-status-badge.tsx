import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KnowledgeDocument, KnowledgeDocumentProcessingStatus, KnowledgeDocumentStatus } from "@/types/knowledge";
import { documentStatusHelp, processingStatusHelp, titleCase } from "./knowledge-hub-utils";

const processingStyles: Record<KnowledgeDocumentProcessingStatus, string> = {
  UPLOADING: "border-sky-200 bg-sky-50 text-sky-700",
  QUEUED: "border-amber-200 bg-amber-50 text-amber-700",
  PROCESSING: "border-primary/20 bg-secondary text-primary",
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NEEDS_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  FAILED: "border-destructive/20 bg-destructive/10 text-destructive",
};

const documentStyles: Record<KnowledgeDocumentStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ARCHIVED: "border-muted-foreground/20 bg-muted text-muted-foreground",
  DELETED: "border-destructive/20 bg-destructive/10 text-destructive",
};

export type KnowledgeDocumentDisplayStatus = "PROCESSING" | "NEEDS_REVIEW" | "APPROVED" | "OUTDATED" | "ARCHIVED" | "FAILED" | "READY";

const displayStyles: Record<KnowledgeDocumentDisplayStatus, string> = {
  PROCESSING: "border-primary/20 bg-secondary text-primary",
  NEEDS_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  OUTDATED: "border-orange-200 bg-orange-50 text-orange-700",
  ARCHIVED: "border-muted-foreground/20 bg-muted text-muted-foreground",
  FAILED: "border-destructive/20 bg-destructive/10 text-destructive",
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function knowledgeDocumentDisplayStatus(document: KnowledgeDocument): KnowledgeDocumentDisplayStatus {
  if (document.status === "ARCHIVED" || document.governanceStatus === "ARCHIVED") return "ARCHIVED";
  if (document.processingStatus === "FAILED") return "FAILED";
  if (["UPLOADING", "QUEUED", "PROCESSING"].includes(document.processingStatus)) return "PROCESSING";
  if (document.processingStatus === "NEEDS_REVIEW" || document.governanceStatus === "REVIEW_REQUIRED") return "NEEDS_REVIEW";
  if (document.governanceStatus === "OUTDATED") return "OUTDATED";
  if (document.governanceStatus === "APPROVED") return "APPROVED";
  return "READY";
}

function ProcessingIcon({ status }: { status: KnowledgeDocumentProcessingStatus }) {
  if (status === "UPLOADING") return <UploadCloud className="size-3.5" />;
  if (status === "QUEUED") return <Clock3 className="size-3.5" />;
  if (status === "PROCESSING") return <LoaderCircle className="size-3.5 animate-spin" />;
  if (status === "FAILED") return <AlertTriangle className="size-3.5" />;
  return <CheckCircle2 className="size-3.5" />;
}

export function DocumentProcessingStatusBadge({ status }: { status: KnowledgeDocumentProcessingStatus }) {
  return (
    <span
      title={processingStatusHelp[status]}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold", processingStyles[status])}
    >
      <ProcessingIcon status={status} />
      {titleCase(status)}
    </span>
  );
}

export function DocumentLifecycleStatusBadge({ status }: { status: KnowledgeDocumentStatus }) {
  return (
    <span
      title={documentStatusHelp[status]}
      className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold", documentStyles[status])}
    >
      {titleCase(status)}
    </span>
  );
}

export function DocumentStatusBadge({ document }: { document: KnowledgeDocument }) {
  const status = knowledgeDocumentDisplayStatus(document);
  const Icon = status === "PROCESSING" ? LoaderCircle
    : status === "NEEDS_REVIEW" ? Clock3
      : status === "FAILED" ? AlertTriangle
        : CheckCircle2;
  const description = status === "NEEDS_REVIEW"
    ? "Human review is required before this document can be used confidently."
    : status === "FAILED"
      ? "Processing failed. Open the document to see the cause and retry when available."
      : status === "OUTDATED"
        ? "This document may no longer match current business information."
        : status === "PROCESSING"
          ? "BizReply is extracting and analyzing this document."
          : `${titleCase(status)} document`;
  return (
    <span title={description} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold", displayStyles[status])}>
      <Icon className={cn("size-3.5", status === "PROCESSING" && "animate-spin")} />
      {titleCase(status)}
    </span>
  );
}
