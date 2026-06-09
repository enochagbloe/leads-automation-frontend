"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import type { SenderAccount } from "@/components/conversations/composer/types";

export function SenderSelector({ accounts, activeId, disabled, onChange }: { accounts: SenderAccount[]; activeId: string; disabled?: boolean; onChange?: (id: string) => void }) {
  const active = accounts.find((item) => item.id === activeId) ?? accounts[0];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={disabled} className="inline-flex h-8 max-w-48 cursor-pointer items-center gap-1.5 rounded-lg bg-composer-control px-2.5 text-xs font-semibold text-composer-foreground outline-none transition-colors hover:bg-composer-control/70 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
        <span className="truncate">{active?.name ?? "Sender"}</span><ChevronDown className="size-3 shrink-0 opacity-60" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={6} align="start" className="account-menu-content z-[70] min-w-52 rounded-xl border bg-popover p-1.5 shadow-[0_14px_40px_rgba(20,35,27,0.14)]">
          {accounts.map((account) => <DropdownMenu.Item key={account.id} disabled={account.disabled} onSelect={() => onChange?.(account.id)} className="relative flex min-h-10 cursor-pointer items-center rounded-lg px-3 pr-8 text-xs font-semibold outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-muted">{account.name}{account.id === activeId && <Check className="absolute right-3 size-3.5 text-primary" />}</DropdownMenu.Item>)}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
