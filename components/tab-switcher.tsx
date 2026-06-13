"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabSwitcherItem = {
  key: string;
  label: string;
  href?: string;
  count?: number;
  disabled?: boolean;
  badgeLabel?: string;
};

export type TabSwitcherProps = {
  items: TabSwitcherItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  variant?: "underline" | "pills";
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
};

export function TabSwitcher({
  items,
  activeKey,
  onChange,
  variant = "underline",
  size = "md",
  className,
  "aria-label": ariaLabel = "Section navigation",
}: TabSwitcherProps) {
  const itemClass = (active: boolean, disabled?: boolean) => cn(
    "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-sm font-semibold outline-none transition-[color,background-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    size === "sm" ? "min-h-10 px-2.5" : "min-h-12 px-3.5",
    variant === "underline"
      ? cn(
        "rounded-t-md text-muted-foreground hover:text-foreground",
        active && "text-primary after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary",
      )
      : cn(
        "rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
        active && "bg-secondary text-secondary-foreground",
      ),
    disabled && "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-muted-foreground",
  );

  const label = (item: TabSwitcherItem) => <>
    <span>{item.label}</span>
    {typeof item.count === "number" && <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-accent">{item.count}</span>}
    {item.badgeLabel && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-primary">{item.badgeLabel}</span>}
  </>;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "overflow-x-auto overscroll-x-contain",
        variant === "underline" && "border-b",
        className,
      )}
    >
      <div className="flex min-w-max items-end gap-1">
        {items.map((item) => {
          const active = item.key === activeKey;
          if (item.href && !item.disabled) {
            return <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined} onClick={() => onChange?.(item.key)} className={itemClass(active)}>{label(item)}</Link>;
          }
          return <button key={item.key} type="button" role={item.href ? undefined : "tab"} aria-selected={item.href ? undefined : active} aria-current={active ? "page" : undefined} disabled={item.disabled} onClick={() => onChange?.(item.key)} className={itemClass(active, item.disabled)}>{label(item)}</button>;
        })}
      </div>
    </nav>
  );
}
