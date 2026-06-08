"use client";

import { AlertCircle, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { filterSearchItems, groupSearchResults, type ParsedSearchQuery, type SearchFilterDefinition } from "@/components/search/search-utils";
import { cn } from "@/lib/utils";

export function GlobalSearch<T>({
  items,
  availableFilters,
  getItemKey,
  getItemLabel,
  getItemGroup,
  getSearchableText,
  resultRenderer,
  onSelect,
  onVisibilityChange,
  loading,
  errorMessage,
  triggerLabel = "Search leads and pages",
  triggerClassName,
  shortcutHint = "Ctrl K",
  placeholder = "Search, or type @status new @source referral",
  instructions = "Use @status, @source, @tag, @assigned, or @type.",
  enableShortcut = true,
}: {
  items: T[];
  availableFilters: SearchFilterDefinition<T>[];
  getItemKey: (item: T) => string;
  getItemLabel: (item: T) => string;
  getItemGroup?: (item: T) => string;
  getSearchableText: (item: T) => string | string[];
  resultRenderer?: (args: { item: T; active: boolean; query: ParsedSearchQuery }) => React.ReactNode;
  onSelect: (item: T) => void;
  onVisibilityChange?: (open: boolean) => void;
  loading?: boolean;
  errorMessage?: string | null;
  triggerLabel?: string;
  triggerClassName?: string;
  shortcutHint?: string;
  placeholder?: string;
  instructions?: string;
  enableShortcut?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const shortcutEnabledRef = useRef(enableShortcut);
  const { parsed, results } = useMemo(() => filterSearchItems({ items, query, availableFilters, getItemLabel, getItemGroup, getSearchableText }), [availableFilters, getItemGroup, getItemLabel, getSearchableText, items, query]);
  const groups = useMemo(() => groupSearchResults(results), [results]);

  useEffect(() => {
    shortcutEnabledRef.current = enableShortcut;
  }, [enableShortcut]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    onVisibilityChange?.(false);
  }, [onVisibilityChange]);

  const show = useCallback(() => {
    setOpen(true);
    onVisibilityChange?.(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [onVisibilityChange]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (shortcutEnabledRef.current && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) close();
        else show();
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [close, open, show]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const choose = (item: T) => {
    onSelect(item);
    close();
  };

  return (
    <>
      <button type="button" onClick={show} className={cn("flex min-h-11 w-11 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:justify-start sm:gap-2 sm:px-3", triggerClassName ?? "sm:w-64")} aria-label={triggerLabel}>
        <Search className="size-4 shrink-0" />
        <span className="hidden flex-1 truncate text-left text-sm sm:block">{triggerLabel}</span>
        {shortcutHint && <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-semibold sm:block">{shortcutHint}</kbd>}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-foreground/25 p-0 backdrop-blur-sm sm:p-6 sm:pt-[10vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div className="global-search-dialog flex h-dvh w-full flex-col overflow-hidden bg-card shadow-[0_30px_100px_rgba(20,35,27,0.25)] sm:h-[min(76dvh,720px)] sm:max-w-3xl sm:rounded-2xl sm:border" role="dialog" aria-modal="true" aria-label="Global search">
            <div className="border-b p-3 sm:p-4">
              <div className="flex items-center gap-3 rounded-xl border bg-background px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && results.length) { event.preventDefault(); setActiveIndex((index) => (index + 1) % results.length); }
                  if (event.key === "ArrowUp" && results.length) { event.preventDefault(); setActiveIndex((index) => (index - 1 + results.length) % results.length); }
                  if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); choose(results[activeIndex].item); }
                }} className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" placeholder={placeholder} aria-label={triggerLabel} />
                <button type="button" onClick={close} className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close search"><X className="size-4" /></button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{instructions}</span>
                {parsed.filters.filter((filter) => filter.value).map((filter) => <span key={filter.raw} className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">@{filter.key} {filter.value}</span>)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {loading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
                : errorMessage ? <div className="grid min-h-64 place-items-center text-center"><div><AlertCircle className="mx-auto size-8 text-destructive" /><h2 className="mt-4 font-bold">Search data could not load</h2><p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p></div></div>
                  : groups.length ? <div className="space-y-5">{groups.map(([group, groupResults]) => <section key={group}><h2 className="px-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{group}</h2><div className="mt-2 space-y-1">{groupResults.map((result) => { const index = results.findIndex((entry) => getItemKey(entry.item) === getItemKey(result.item)); const active = index === activeIndex; return <button key={getItemKey(result.item)} data-search-index={index} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(result.item)} className={cn("w-full rounded-xl px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-secondary/70" : "hover:bg-muted")}>{resultRenderer ? resultRenderer({ item: result.item, active, query: parsed }) : getItemLabel(result.item)}</button>; })}</div></section>)}</div>
                    : <div className="grid min-h-64 place-items-center text-center"><div><Search className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 font-bold">No matching results</h2><p className="mt-2 text-sm text-muted-foreground">Try a broader phrase or an @filter.</p></div></div>}
            </div>
            <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t bg-muted/35 px-4 py-3 text-xs text-muted-foreground"><span><KeyCap>↑↓</KeyCap> Navigate</span><span><KeyCap>Enter</KeyCap> Open</span><span><KeyCap>Esc</KeyCap> Close</span></footer>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return <kbd className="mr-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-md border bg-card px-1.5 font-semibold text-foreground">{children}</kbd>;
}
