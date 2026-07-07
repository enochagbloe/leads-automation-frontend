"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Camera, Image as ImageIcon, Mic, Paperclip, Plus, Smile, Type } from "lucide-react";
import { MacroSelector } from "@/components/conversations/composer/macro-selector";
import type { Macro } from "@/components/conversations/composer/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function ToolButton({ label, disabled, onClick, children, className }: { label: string; disabled?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return <button type="button" disabled={disabled} aria-label={label} title={label} onClick={onClick} className={cn("grid size-7 cursor-pointer place-items-center rounded-md text-composer-foreground/65 outline-none transition-colors hover:bg-composer-control hover:text-composer-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35 sm:size-8", className)}>{children}</button>;
}

function MobileAttachmentMenu({ disabled, onAttachFile }: { disabled?: boolean; onAttachFile?: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={disabled} className="grid size-7 cursor-pointer place-items-center rounded-full bg-composer-control text-composer-foreground outline-none transition-colors hover:bg-composer-control/75 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35 sm:hidden" aria-label="Open attachment options">
        <Plus className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={8} align="start" className="account-menu-content z-[80] min-w-44 rounded-xl border bg-popover p-1.5 shadow-[0_14px_40px_rgba(20,35,27,0.14)]">
          <DropdownMenu.Item onSelect={onAttachFile} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold outline-none data-[highlighted]:bg-muted">
            <Paperclip className="size-3.5 text-primary" />Attach file
          </DropdownMenu.Item>
          <DropdownMenu.Item disabled className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-muted">
            <Camera className="size-3.5 text-primary" />Camera
          </DropdownMenu.Item>
          <DropdownMenu.Item disabled className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-muted">
            <ImageIcon className="size-3.5 text-primary" />Gallery
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function ComposerToolbar({ macros, disabled, attachmentDisabled, emojiDisabled, voiceNoteDisabled, onAttachFile, onOpenEmojiPicker, onStartVoiceNote, onSelectMacro }: { macros: Macro[]; disabled?: boolean; attachmentDisabled?: boolean; emojiDisabled?: boolean; voiceNoteDisabled?: boolean; onAttachFile?: () => void; onOpenEmojiPicker?: () => void; onStartVoiceNote?: () => void; onSelectMacro: (macro: Macro) => void }) {
  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <MobileAttachmentMenu disabled={disabled || attachmentDisabled} onAttachFile={onAttachFile} />
      <ToolButton label="Text formatting coming soon" disabled className="hidden sm:grid"><Type className="size-3.5" /></ToolButton>
      <ToolButton label="Open emoji picker" disabled={disabled || emojiDisabled} onClick={onOpenEmojiPicker}><Smile className="size-3.5" /></ToolButton>
      <ToolButton label="Attach file" disabled={disabled || attachmentDisabled} onClick={onAttachFile} className="hidden sm:grid"><Paperclip className="size-3.5" /></ToolButton>
      <ToolButton label="Start voice note" disabled={disabled || voiceNoteDisabled} onClick={onStartVoiceNote} className="hidden sm:grid"><Mic className="size-3.5" /></ToolButton>
      <span className={cn("mx-1 hidden h-5 w-px bg-composer-foreground/15 sm:block")} aria-hidden="true" />
      <span className="hidden sm:inline-flex"><MacroSelector macros={macros} disabled={disabled} onSelect={onSelectMacro} /></span>
    </div>
  );
}
