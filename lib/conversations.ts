import type { ConversationChannel, ConversationPriority, ConversationStatus } from "@/types/conversation";

export const CONVERSATION_STATUSES: ConversationStatus[] = ["OPEN", "AI_HANDLING", "HUMAN_HANDLING", "CLOSED"];
export const ACTIVE_CONVERSATION_STATUSES: ConversationStatus[] = ["OPEN", "AI_HANDLING", "HUMAN_HANDLING"];
export const CONVERSATION_CHANNELS: ConversationChannel[] = ["MANUAL", "WHATSAPP", "WEBSITE_CHAT", "INSTAGRAM", "FACEBOOK", "EMAIL", "OTHER"];
export const CONVERSATION_PRIORITIES: ConversationPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  OPEN: "Open",
  AI_HANDLING: "AI handling",
  HUMAN_HANDLING: "Human handling",
  CLOSED: "Closed",
};

export const CONVERSATION_CHANNEL_LABELS: Record<ConversationChannel, string> = {
  MANUAL: "Manual",
  WHATSAPP: "WhatsApp",
  WEBSITE_CHAT: "Website chat",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  EMAIL: "Email",
  OTHER: "Other",
};

export const CONVERSATION_PRIORITY_LABELS: Record<ConversationPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export function conversationPriorityTone(priority: ConversationPriority) {
  if (priority === "URGENT") return "bg-destructive/10 text-destructive";
  if (priority === "HIGH") return "bg-warning/10 text-warning";
  if (priority === "LOW") return "bg-info/10 text-info";
  return "bg-muted text-muted-foreground";
}

export function formatConversationTime(value: string | null) {
  if (!value) return "No messages";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return new Intl.DateTimeFormat("en-GH", { hour: "numeric", minute: "2-digit" }).format(date);
  return new Intl.DateTimeFormat("en-GH", { month: "short", day: "numeric" }).format(date);
}

export function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-GH", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function formatConversationDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
