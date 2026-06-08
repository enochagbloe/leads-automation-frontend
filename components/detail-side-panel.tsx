"use client";

import { X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { AppButton } from "@/components/app-button";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type DetailSidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actionLabel?: string;
  onActionClick?: () => void;
  width?: number | string;
  children: ReactNode;
  className?: string;
};

export function DetailSidePanel({
  open,
  onOpenChange,
  title,
  description = "Review details without leaving the current page.",
  actionLabel,
  onActionClick,
  width = "min(760px, 44vw)",
  children,
  className,
}: DetailSidePanelProps) {
  const panelStyle = { "--detail-panel-width": typeof width === "number" ? `${width}px` : width } as CSSProperties;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          style={panelStyle}
          className={cn(
            "inset-y-0 right-0 grid h-dvh w-full grid-rows-[auto_minmax(0,1fr)] border-l bg-card text-card-foreground shadow-[-18px_0_54px_rgba(20,35,27,0.12)] will-change-transform",
            "sm:w-[var(--detail-panel-width)]",
            className,
          )}
        >
          <header className="relative z-10 flex min-h-20 items-center justify-between gap-3 border-b bg-card px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <AppButton size="icon" variant="ghost" aria-label={`Close ${title}`} onClick={() => onOpenChange(false)}>
                <X className="size-5" aria-hidden="true" />
              </AppButton>
              <div className="min-w-0">
                <DialogTitle className="truncate text-base font-bold tracking-tight sm:text-lg">{title}</DialogTitle>
                <DialogDescription className="sr-only">{description}</DialogDescription>
              </div>
            </div>
            {actionLabel && (
              <AppButton size="sm" onClick={onActionClick} className="shrink-0">
                {actionLabel}
              </AppButton>
            )}
          </header>
          <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
