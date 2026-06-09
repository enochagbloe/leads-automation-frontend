"use client";

import { Mic, Paperclip, Smile, Type } from "lucide-react";
import { MacroSelector } from "@/components/conversations/composer/macro-selector";
import type { Macro } from "@/components/conversations/composer/types";
import { cn } from "@/lib/utils";

function ToolButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return <button type="button" disabled={disabled} aria-label={label} title={label} onClick={onClick} className="grid size-8 cursor-pointer place-items-center rounded-md text-composer-foreground/65 outline-none transition-colors hover:bg-composer-control hover:text-composer-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35">{children}</button>;
}

export function ComposerToolbar({ macros, disabled, attachmentDisabled, emojiDisabled, voiceNoteDisabled, onAttachFile, onOpenEmojiPicker, onStartVoiceNote, onSelectMacro }: { macros: Macro[]; disabled?: boolean; attachmentDisabled?: boolean; emojiDisabled?: boolean; voiceNoteDisabled?: boolean; onAttachFile?: () => void; onOpenEmojiPicker?: () => void; onStartVoiceNote?: () => void; onSelectMacro: (macro: Macro) => void }) {
  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <ToolButton label="Text formatting coming soon" disabled><Type className="size-3.5" /></ToolButton>
      <ToolButton label="Open emoji picker" disabled={disabled || emojiDisabled} onClick={onOpenEmojiPicker}><Smile className="size-3.5" /></ToolButton>
      <ToolButton label="Attach file" disabled={disabled || attachmentDisabled} onClick={onAttachFile}><Paperclip className="size-3.5" /></ToolButton>
      <ToolButton label="Start voice note" disabled={disabled || voiceNoteDisabled} onClick={onStartVoiceNote}><Mic className="size-3.5" /></ToolButton>
      <span className={cn("mx-1 h-5 w-px bg-composer-foreground/15")} aria-hidden="true" />
      <MacroSelector macros={macros} disabled={disabled} onSelect={onSelectMacro} />
    </div>
  );
}
