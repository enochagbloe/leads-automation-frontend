"use client";

import { useMemo, useState } from "react";
import { FileUp, UploadCloud, X } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { KnowledgeVisibility } from "@/types/knowledge";
import { formatBytes } from "./knowledge-hub-utils";

export const allowedKnowledgeUploadExtensions = ["pdf", "docx", "txt", "csv", "xlsx", "pptx", "png", "jpg", "jpeg", "webp"];
export const maxKnowledgeUploadBytes = 25 * 1024 * 1024;

function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function validateKnowledgeUploadFile(file: File | null) {
  if (!file) return "Select a file to upload.";
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > maxKnowledgeUploadBytes) return `File must be smaller than ${formatBytes(maxKnowledgeUploadBytes)}.`;
  if (!allowedKnowledgeUploadExtensions.includes(fileExtension(file.name))) return "This file type is not supported yet.";
  return null;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  busy,
  onUpload,
  uploadError,
  initialFile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  uploadError?: unknown;
  initialFile?: File | null;
  onUpload: (input: { file: File; title: string; description: string; category: string; tags: string; visibility: KnowledgeVisibility }) => void;
}) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [title, setTitle] = useState(initialFile ? initialFile.name.replace(/\.[^.]+$/, "") : "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<KnowledgeVisibility>("INTERNAL_ONLY");
  const [dragging, setDragging] = useState(false);
  const fileError = useMemo(() => validateKnowledgeUploadFile(file), [file]);

  const selectFile = (nextFile: File | null) => {
    setFile(nextFile);
    if (nextFile && !title.trim()) setTitle(nextFile.name.replace(/\.[^.]+$/, ""));
  };

  const backendError = uploadError instanceof ApiError ? uploadError.message : uploadError ? getApiErrorMessage(uploadError) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="left-1/2 top-1/2 z-[95] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.35rem] border bg-card p-0 shadow-[0_24px_80px_rgba(20,35,27,0.22)]">
          <div className="flex items-start justify-between gap-4 border-b p-5">
            <div>
              <DialogTitle className="text-lg font-bold">Upload document</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Add a business document to the active Knowledge Hub. Processing starts after upload.
              </DialogDescription>
            </div>
            <button type="button" className="rounded-full p-2 text-muted-foreground hover:bg-muted" onClick={() => onOpenChange(false)} disabled={busy} aria-label="Close upload dialog">
              <X className="size-4" />
            </button>
          </div>

          <form
            className="space-y-4 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!file || fileError || !title.trim()) return;
              onUpload({ file, title: title.trim(), description, category, tags, visibility });
            }}
          >
            <label
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                selectFile(event.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/25 p-8 text-center transition-colors hover:bg-muted/40",
                dragging && "border-primary bg-secondary",
              )}
            >
              <input type="file" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
              <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                <UploadCloud className="size-5" />
              </span>
              <span className="mt-3 text-sm font-bold">{file ? file.name : "Drop a document here or click to browse"}</span>
              <span className="mt-1 text-xs text-muted-foreground">{file ? `${formatBytes(file.size)} · ${file.type || fileExtension(file.name).toUpperCase()}` : "PDF, DOCX, TXT, CSV, XLSX, PPTX, and image files up to 25 MB"}</span>
            </label>
            {fileError && file && <p className="text-sm font-medium text-destructive">{fileError}</p>}
            {backendError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{backendError}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Document title <span className="text-destructive">*</span>
                <AppInput value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-11 rounded-xl" placeholder="Company profile" />
              </label>
              <label className="block text-sm font-semibold">
                Visibility
                <AppSelect
                  value={visibility}
                  onValueChange={(value) => setVisibility(value as KnowledgeVisibility)}
                  options={[
                    { value: "INTERNAL_ONLY", label: "Internal only" },
                    { value: "CLIENT_SENDABLE", label: "Client sendable" },
                  ]}
                  className="mt-2"
                />
              </label>
            </div>
            <label className="block text-sm font-semibold">
              Description
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Short context for your team." />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Category
                <AppInput value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-11 rounded-xl" placeholder="Policies" />
              </label>
              <label className="block text-sm font-semibold">
                Tags
                <AppInput value={tags} onChange={(event) => setTags(event.target.value)} className="mt-2 h-11 rounded-xl" placeholder="refund, policy" />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-xs text-muted-foreground"><FileUp className="mr-1 inline size-3.5" />Backend confirms durable storage before the document appears.</p>
              <div className="flex gap-2">
                <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</AppButton>
                <AppButton type="submit" loading={busy} loadingText="Uploading" disabled={busy || Boolean(fileError) || !title.trim()}>Upload document</AppButton>
              </div>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
