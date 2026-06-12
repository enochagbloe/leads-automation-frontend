import type { ReactNode } from "react";

export type Channel = {
  id: string;
  name: string;
  icon?: ReactNode;
  disabled?: boolean;
  description?: string;
};

export type SenderAccount = {
  id: string;
  name: string;
  disabled?: boolean;
};

export type Macro = {
  id: string;
  title: string;
  content: string;
};

export type ConversationComposerProps = {
  channels: Channel[];
  activeChannelId: string;
  senderAccounts: SenderAccount[];
  activeSenderAccountId: string;
  macros?: Macro[];
  message?: string;
  disabled?: boolean;
  isSending?: boolean;
  endChatDisabled?: boolean;
  endChatTrigger?: ReactNode;
  attachmentDisabled?: boolean;
  emojiDisabled?: boolean;
  voiceNoteDisabled?: boolean;
  onChannelChange?: (channelId: string) => void;
  onSenderAccountChange?: (accountId: string) => void;
  onMessageChange?: (message: string) => void;
  onSendMessage?: (payload: {
    message: string;
    channelId: string;
    senderAccountId: string;
  }) => Promise<void> | void;
  onEndChat?: () => void;
  onAttachFile?: () => void;
  onOpenEmojiPicker?: () => void;
  onStartVoiceNote?: () => void;
  onSelectMacro?: (macro: Macro) => void;
};
