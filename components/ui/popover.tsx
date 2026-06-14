"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ align = "center", sideOffset = 6, className, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-[100] rounded-xl border bg-popover p-1 text-popover-foreground shadow-[0_14px_40px_rgba(20,35,27,0.14),0_2px_8px_rgba(20,35,27,0.06)] outline-none data-[state=closed]:animate-[account-menu-out_120ms_ease-in] data-[state=open]:animate-[account-menu-in_180ms_cubic-bezier(0.16,1,0.3,1)]",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
