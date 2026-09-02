"use client";

import { useRef, useState } from "react";
import { FileUp, UploadCloud } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { systemNotify } from "@/lib/system-notifications";
import { cn } from "@/lib/utils";
import { formatBytes } from "./knowledge-hub-utils";
import { maxKnowledgeUploadBytes, validateKnowledgeUploadFile } from "./upload-document-dialog";

export function DocumentDropZone({
  canManage,
  onFileAccepted,
}: {
  canManage: boolean;
  onFileAccepted: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  if (!canManage) return null;

  const acceptFile = (file?: File | null) => {
    if (!file) return;
    const validationError = validateKnowledgeUploadFile(file);
    if (validationError) {
      systemNotify.error("Document cannot be uploaded", { description: validationError });
      return;
    }
    onFileAccepted(file);
  };

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        acceptFile(event.dataTransfer.files?.[0]);
      }}
      className={cn(
        "rounded-2xl border border-dashed bg-card p-5 transition-colors",
        dragging ? "border-primary bg-secondary/70" : "border-border hover:border-primary/50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
            {dragging ? <UploadCloud className="size-5" /> : <FileUp className="size-5" />}
          </span>
          <div>
            <h2 className="text-sm font-bold">Drop files into Knowledge Hub</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Drag a PDF, document, spreadsheet, presentation, text file, or image here. BizReply will verify it and open the review step before upload.
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">Maximum file size: {formatBytes(maxKnowledgeUploadBytes)}</p>
          </div>
        </div>
        <AppButton type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          Choose file
        </AppButton>
      </div>
    </section>
  );
}
