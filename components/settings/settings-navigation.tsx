"use client";

import { cn } from "@/lib/utils";
import type { SettingsNavItem, SettingsSectionKey } from "@/components/settings/settings-types";

export function SettingsNavigation({
  items,
  activeSection,
  onSelect,
}: {
  items: SettingsNavItem[];
  activeSection: SettingsSectionKey;
  onSelect: (section: SettingsSectionKey) => void;
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-muted/35 p-2 md:flex-col md:gap-1.5 md:overflow-visible md:border-b-0 md:bg-transparent md:p-3 md:pt-4" aria-label="Settings sections">
      {items.map((item) => {
        const active = item.key === activeSection;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className={cn(
              "flex min-h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring md:w-full",
              active ? "bg-card text-primary shadow-sm ring-1 ring-border/80" : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
