"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Sparkles } from "lucide-react";
import type { Macro } from "@/components/conversations/composer/types";

export function MacroSelector({ macros, disabled, onSelect }: { macros: Macro[]; disabled?: boolean; onSelect: (macro: Macro) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={disabled || macros.length === 0} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-composer-foreground/10 bg-composer-control px-3 text-xs font-semibold text-composer-foreground outline-none transition-colors hover:bg-composer-control/70 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45">
        Macros <ChevronDown className="size-3 opacity-60" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={6} align="start" className="account-menu-content z-[70] w-72 rounded-xl border bg-popover p-1.5 shadow-[0_14px_40px_rgba(20,35,27,0.14)]">
          <DropdownMenu.Label className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Reply macros</DropdownMenu.Label>
          {macros.map((macro) => <DropdownMenu.Item key={macro.id} onSelect={() => onSelect(macro)} className="flex cursor-pointer gap-2 rounded-lg px-3 py-2.5 outline-none data-[highlighted]:bg-muted"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" /><span><span className="block text-xs font-semibold">{macro.title}</span><span className="mt-0.5 line-clamp-2 block text-[10px] leading-4 text-muted-foreground">{macro.content}</span></span></DropdownMenu.Item>)}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
