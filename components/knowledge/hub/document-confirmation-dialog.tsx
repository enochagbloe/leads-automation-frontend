"use client";

import { AppButton } from "@/components/app-button";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";

export type DocumentConfirmation = {
  action: "archive" | "restore" | "delete" | "retry";
  documentId: string;
  title: string;
} | null;

const copy = {
  archive: {
    title: "Archive this document?",
    description: "It will no longer appear in the active Knowledge Hub, but its file and history will remain available.",
    confirm: "Archive document",
    destructive: false,
  },
  restore: {
    title: "Restore this document?",
    description: "It will return to the active Knowledge Hub and keep its version history.",
    confirm: "Restore document",
    destructive: false,
  },
  delete: {
    title: "Delete this document?",
    description: "It will be removed from the Knowledge Hub. Retention and cleanup follow your business data-retention policy.",
    confirm: "Delete document",
    destructive: true,
  },
  retry: {
    title: "Retry processing?",
    description: "BizReply will retry processing the stored file without uploading it again or creating a duplicate version.",
    confirm: "Retry processing",
    destructive: false,
  },
};

export function DocumentConfirmationDialog({
  confirmation,
  loading,
  onClose,
  onConfirm,
}: {
  confirmation: DocumentConfirmation;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const content = confirmation ? copy[confirmation.action] : null;
  return (
    <Dialog open={Boolean(confirmation)} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="left-1/2 top-1/2 z-[110] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-[0_24px_80px_rgba(20,35,27,0.22)]">
          {content && (
            <>
              <DialogTitle className="text-lg font-bold">{content.title}</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                {content.description}
              </DialogDescription>
              <p className="mt-3 rounded-xl bg-muted/45 px-3 py-2 text-sm font-semibold">{confirmation?.title}</p>
              <div className="mt-6 flex justify-end gap-2">
                <AppButton variant="outline" onClick={onClose} disabled={loading}>Cancel</AppButton>
                <AppButton variant={content.destructive ? "destructive" : "default"} onClick={onConfirm} loading={loading}>
                  {content.confirm}
                </AppButton>
              </div>
            </>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
