"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, MessageCircle } from "lucide-react";
import type { Channel } from "@/components/conversations/composer/types";

export function ChannelSelector({ channels, activeId, disabled, onChange }: { channels: Channel[]; activeId: string; disabled?: boolean; onChange?: (id: string) => void }) {
  const active = channels.find((item) => item.id === activeId) ?? channels[0];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={disabled} className="inline-flex h-7 max-w-36 cursor-pointer items-center gap-1.5 rounded-lg bg-composer-control px-2 text-xs font-semibold text-composer-foreground outline-none transition-colors hover:bg-composer-control/70 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:max-w-40 sm:px-2.5">
        <span className="grid size-4 shrink-0 place-items-center text-success">{active?.icon ?? <MessageCircle className="size-3.5 fill-current" />}</span>
        <span className="truncate">{active?.name ?? "Channel"}</span>
        <ChevronDown className="size-3 shrink-0 opacity-60" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={6} align="start" className="account-menu-content z-[70] min-w-52 rounded-xl border bg-popover p-1.5 shadow-[0_14px_40px_rgba(20,35,27,0.14)]">
          {channels.map((channel) => (
            <DropdownMenu.Item key={channel.id} disabled={channel.disabled} onSelect={() => onChange?.(channel.id)} className="relative flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 pr-8 text-xs outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-muted">
              <span className="grid size-4 place-items-center text-success">{channel.icon ?? <MessageCircle className="size-3.5" />}</span>
              <span><span className="block font-semibold">{channel.name}</span>{channel.description && <span className="block text-[10px] text-muted-foreground">{channel.description}</span>}</span>
              {channel.id === activeId && <Check className="absolute right-3 size-3.5 text-primary" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
