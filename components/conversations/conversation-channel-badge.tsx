import { MessageCircle } from "lucide-react";
import { CONVERSATION_CHANNEL_LABELS } from "@/lib/conversations";
import { cn } from "@/lib/utils";
import type { ConversationChannel } from "@/types/conversation";

export function ConversationChannelBadge({ channel, compact = false }: { channel: ConversationChannel; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground",
        channel === "WHATSAPP" && "bg-success/10 text-success",
        compact && "px-2 py-0.5 text-[10px]",
      )}
    >
      <MessageCircle className="size-3.5" aria-hidden="true" />
      {CONVERSATION_CHANNEL_LABELS[channel]}
    </span>
  );
}
