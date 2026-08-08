import type { KnowledgeDocument, KnowledgeDocumentAction, KnowledgeDocumentProcessingStatus, KnowledgeDocumentStatus } from "@/types/knowledge";

export function titleCase(value?: string | null) {
  if (!value) return "Not provided";
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

export function formatKnowledgeDate(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function uploadedByName(document: KnowledgeDocument) {
  const user = document.uploadedBy?.user;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return name || "Unknown uploader";
}

export function versionNumber(document: KnowledgeDocument) {
  return document.activeVersion?.versionNumber ?? document._count?.versions ?? 1;
}

export function hasDocumentAction(document: KnowledgeDocument | undefined | null, action: KnowledgeDocumentAction) {
  return Boolean(document?.availableActions?.includes(action));
}

export const processingStatusHelp: Record<KnowledgeDocumentProcessingStatus, string> = {
  UPLOADING: "The document file is still uploading.",
  QUEUED: "Waiting to be processed.",
  PROCESSING: "The document is being prepared.",
  READY: "The document is ready for use.",
  NEEDS_REVIEW: "The document needs review before use.",
  FAILED: "Processing failed. Review the error or retry.",
};

export const documentStatusHelp: Record<KnowledgeDocumentStatus, string> = {
  ACTIVE: "Visible in the active Knowledge Hub.",
  ARCHIVED: "Hidden from the active Knowledge Hub but retained.",
  DELETED: "Removed from normal Knowledge Hub views.",
};
