import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KnowledgeDocumentProcessingStatus, KnowledgeDocumentStatus } from "@/types/knowledge";
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
