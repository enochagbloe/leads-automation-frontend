"use client";

import { LoaderCircle, Send, Unplug } from "lucide-react";
import { useRef, useState } from "react";
import { ChannelSelector } from "@/components/conversations/composer/channel-selector";
import { ComposerToolbar } from "@/components/conversations/composer/composer-toolbar";
import { SenderSelector } from "@/components/conversations/composer/sender-selector";
import type { ConversationComposerProps, Macro } from "@/components/conversations/composer/types";
import { cn } from "@/lib/utils";

export function ConversationComposer({
  channels,
  activeChannelId,
  senderAccounts,
  activeSenderAccountId,
  macros = [],
  message,
  disabled,
  isSending,
  endChatDisabled,
  attachmentDisabled,
  emojiDisabled,
  voiceNoteDisabled,
  onChannelChange,
  onSenderAccountChange,
  onMessageChange,
  onSendMessage,
  onEndChat,
  onAttachFile,
  onOpenEmojiPicker,
  onStartVoiceNote,
  onSelectMacro,
}: ConversationComposerProps) {
  const [internalMessage, setInternalMessage] = useState(message ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const value = message ?? internalMessage;

  const updateMessage = (next: string) => {
    if (message === undefined) setInternalMessage(next);
    onMessageChange?.(next);
  };

  const selectMacro = (macro: Macro) => {
    updateMessage(value ? `${value}\n${macro.content}` : macro.content);
    onSelectMacro?.(macro);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const sendMessage = async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isSending) return;
    await onSendMessage?.({ message: trimmed, channelId: activeChannelId, senderAccountId: activeSenderAccountId });
    if (message === undefined) updateMessage("");
  };

  return (
    <section aria-label="Conversation message composer" className={cn("w-full rounded-xl border border-composer-foreground/15 bg-composer px-2.5 py-2.5 text-composer-foreground shadow-[0_2px_8px_rgba(48,44,36,0.05)] transition-[border-color,box-shadow] focus-within:border-composer-foreground/25 focus-within:shadow-[0_3px_12px_rgba(48,44,36,0.08)]", disabled && "opacity-65")}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <ChannelSelector channels={channels} activeId={activeChannelId} disabled={disabled || isSending} onChange={onChannelChange} />
        <span className="text-[10px] font-medium text-composer-foreground/50">From</span>
        <SenderSelector accounts={senderAccounts} activeId={activeSenderAccountId} disabled={disabled || isSending} onChange={onSenderAccountChange} />
        <button type="button" disabled className="ml-auto grid size-8 place-items-center rounded-lg bg-composer-control text-composer-foreground/45" aria-label="Connection settings coming soon" title="Connection settings coming soon"><Unplug className="size-3.5" /></button>
      </div>

      <label htmlFor="conversation-composer-input" className="sr-only">Message</label>
      <textarea
        ref={textareaRef}
        id="conversation-composer-input"
        rows={2}
        value={value}
        disabled={disabled || isSending}
        onChange={(event) => updateMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void sendMessage();
          }
        }}
        placeholder="Comment or Type '/' For commands"
        className="my-1.5 min-h-14 w-full resize-none bg-transparent px-1.5 py-2 text-sm leading-5 text-composer-foreground outline-none placeholder:text-composer-foreground/40 disabled:cursor-not-allowed"
      />

      <div className="flex flex-wrap items-center gap-2">
        <ComposerToolbar macros={macros} disabled={disabled || isSending} attachmentDisabled={attachmentDisabled} emojiDisabled={emojiDisabled} voiceNoteDisabled={voiceNoteDisabled} onAttachFile={onAttachFile} onOpenEmojiPicker={onOpenEmojiPicker} onStartVoiceNote={onStartVoiceNote} onSelectMacro={selectMacro} />
        <div className="ml-auto flex items-center gap-2">
          <button type="button" disabled={disabled || isSending || endChatDisabled} onClick={onEndChat} className="min-h-8 cursor-pointer px-2 text-xs font-semibold text-composer-foreground underline decoration-composer-foreground/35 underline-offset-4 outline-none hover:decoration-composer-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40">End Chat</button>
          <button type="button" disabled={disabled || isSending || !value.trim()} onClick={() => void sendMessage()} className="inline-flex min-h-9 min-w-16 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-composer-foreground px-4 text-xs font-semibold text-composer transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40">
            {isSending ? <><LoaderCircle className="size-3.5 animate-spin" />Sending</> : <><Send className="size-3.5 sm:hidden" />Send</>}
          </button>
        </div>
      </div>
    </section>
  );
}

export type { Channel, ConversationComposerProps, Macro, SenderAccount } from "@/components/conversations/composer/types";
