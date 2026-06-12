import type { LeadActivity, LeadAssignee, LeadStatus } from "@/types/lead";

export type ConversationChannel = "MANUAL" | "WHATSAPP" | "OTHER" | "INSTAGRAM" | "FACEBOOK" | "WEBSITE_CHAT" | "EMAIL";
export type ConversationStatus = "OPEN" | "AI_HANDLING" | "HUMAN_HANDLING" | "CLOSED";
export type ConversationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type MessageSenderType = "CUSTOMER" | "STAFF" | "AI" | "SYSTEM";
export type MessageType = "TEXT" | "SYSTEM" | "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO" | "LOCATION";
export type MessageDirection = "INBOUND" | "OUTBOUND" | "INTERNAL";
export type MessageDeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "INTERNAL";
export type ConversationSortBy = "lastMessageAt" | "createdAt" | "updatedAt" | "status";
export type ConversationSortOrder = "asc" | "desc";

export interface ConversationLead {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: LeadStatus;
}

export interface Conversation {
  id: string;
  displayId: string;
  businessId: string;
  leadId: string;
  assignedStaffId: string | null;
  assignedStaff: LeadAssignee | null;
  lead: ConversationLead;
  channel: ConversationChannel;
  status: ConversationStatus;
  subject: string | null;
  priority: ConversationPriority;
  pinned: boolean;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  aiEnabled: boolean;
  humanTakeover: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  deletedAt: string | null;
}

export interface ConversationMessage {
  id: string;
  businessId: string;
  conversationId: string;
  leadId: string;
  senderType: MessageSenderType;
  senderUserId: string | null;
  senderUser: { id: string; firstName: string; lastName: string } | null;
  content: string;
  messageType: MessageType;
  direction: MessageDirection;
  deliveryStatus: MessageDeliveryStatus;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ConversationListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: ConversationStatus;
  channel?: ConversationChannel;
  assignedStaffId?: string;
  leadId?: string;
  priority?: ConversationPriority;
  pinned?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy: ConversationSortBy;
  sortOrder: ConversationSortOrder;
}

export interface ConversationListResponse {
  data: Conversation[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ConversationStats {
  total: number;
  open: number;
  aiHandling: number;
  humanHandling: number;
  closed: number;
  unread: number;
}

export interface ConversationDetailResponse {
  conversation: Conversation;
  lead: ConversationLead;
  assignedStaff: LeadAssignee | null;
  messages: ConversationMessage[];
  activities: LeadActivity[];
  messagePagination: { limit: number; hasMore: boolean; nextBeforeMessageId: string | null };
}

export interface CreateConversationInput {
  leadId: string;
  subject?: string | null;
  assignedStaffId?: string | null;
  channel?: ConversationChannel;
  priority?: ConversationPriority;
}

export interface UpdateConversationInput {
  subject?: string | null;
  priority?: ConversationPriority;
  pinned?: boolean;
}

export interface CreateMessageInput {
  content: string;
}
