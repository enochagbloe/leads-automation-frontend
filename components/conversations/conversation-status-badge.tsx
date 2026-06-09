import { Bot, CheckCircle2, Headphones, MessageCircle } from "lucide-react";
import { CONVERSATION_STATUS_LABELS } from "@/lib/conversations";
import { cn } from "@/lib/utils";
import type { ConversationStatus } from "@/types/conversation";

export function ConversationStatusBadge({ status, compact = false }: { status: ConversationStatus; compact?: boolean }) {
  const Icon = status === "AI_HANDLING" ? Bot : status === "HUMAN_HANDLING" ? Headphones : status === "CLOSED" ? CheckCircle2 : MessageCircle;
  return (
    <span className={cn(
      "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
      status === "OPEN" && "bg-secondary text-secondary-foreground",
      status === "AI_HANDLING" && "bg-info/10 text-info",
      status === "HUMAN_HANDLING" && "bg-accent/15 text-accent",
      status === "CLOSED" && "bg-muted text-muted-foreground",
      compact && "px-2 py-0.5 text-[10px]",
    )}><Icon className="size-3.5" aria-hidden="true" />{CONVERSATION_STATUS_LABELS[status]}</span>
  );
}
