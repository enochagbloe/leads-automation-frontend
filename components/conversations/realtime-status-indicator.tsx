"use client";

import { useRealtimeConnectionStatus } from "@/components/providers/realtime-provider";
import { cn } from "@/lib/utils";

export function RealtimeStatusIndicator({ className }: { className?: string }) {
  const status = useRealtimeConnectionStatus();
  const connected = status === "connected";
  const connecting = status === "connecting";
  const label = connected ? "Live" : connecting ? "Connecting..." : "Offline — using refresh fallback";

  return (
    <span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full border bg-card px-2.5 text-[10px] font-semibold text-muted-foreground", className)} title={label}>
      <span className={cn("size-1.5 rounded-full", connected ? "bg-success" : connecting ? "animate-pulse bg-warning" : "bg-muted-foreground")} />
      <span className={cn(!connected && !connecting && "hidden sm:inline")}>{label}</span>
    </span>
  );
}
