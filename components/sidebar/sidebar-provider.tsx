"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

export type SidebarMode = "EXPANDED" | "COLLAPSED" | "AUTO";

const STORAGE_KEY = "bizreply.sidebar.mode";
const CHANGE_EVENT = "bizreply:sidebar-mode-change";

type SidebarContextValue = {
  mode: SidebarMode;
  setMode: (mode: SidebarMode) => void;
  desktopExpanded: boolean;
  setHovered: (hovered: boolean) => void;
  setInteractionOpen: (open: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function isSidebarMode(value: string | null): value is SidebarMode {
  return value === "EXPANDED" || value === "COLLAPSED" || value === "AUTO";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): SidebarMode {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return isSidebarMode(saved) ? saved : "AUTO";
}

function getServerSnapshot(): SidebarMode {
  return "AUTO";
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [hovered, setHovered] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const setMode = useCallback((nextMode: SidebarMode) => {
    window.localStorage.setItem(STORAGE_KEY, nextMode);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  const toggleMobile = useCallback(() => setMobileOpen((open) => !open), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  const value = useMemo<SidebarContextValue>(() => ({
    mode,
    setMode,
    desktopExpanded: mode === "EXPANDED" || (mode === "AUTO" && (hovered || interactionOpen)),
    setHovered,
    setInteractionOpen,
    mobileOpen,
    setMobileOpen,
    toggleMobile,
  }), [hovered, interactionOpen, mobileOpen, mode, setMode, toggleMobile]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider");
  return context;
}

export function useSidebarMode() {
  const { mode, setMode } = useSidebar();
  return { mode, setMode };
}
