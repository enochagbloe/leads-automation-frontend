"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-[80] bg-foreground/35 backdrop-blur-[2px]",
        "data-[state=open]:animate-[detail-overlay-in_220ms_ease-out] data-[state=closed]:animate-[detail-overlay-out_150ms_ease-in]",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Content
      className={cn(
        "fixed z-[90] outline-none",
        "data-[state=open]:animate-[detail-panel-in_240ms_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[detail-panel-out_160ms_ease-in]",
        className,
      )}
      {...props}
    />
  );
}
