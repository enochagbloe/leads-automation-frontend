import { apiRequest } from "@/lib/api-client";
import type { ApiMessage } from "@/types/auth";
import type {
  Conversation,
  ConversationDetailResponse,
  ConversationListQuery,
  ConversationListResponse,
  ConversationStats,
  ConversationStatus,
  CreateConversationInput,
  CreateMessageInput,
  ConversationMessage,
  UpdateConversationInput,
} from "@/types/conversation";

function queryString(query: object) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export const conversationService = {
  list: (query: ConversationListQuery) => apiRequest<ConversationListResponse>(`/conversations?${queryString(query)}`),
  stats: () => apiRequest<ConversationStats>("/conversations/stats"),
  detail: (id: string, beforeMessageId?: string) => apiRequest<ConversationDetailResponse>(`/conversations/${id}?${queryString({ messageLimit: 50, beforeMessageId })}`),
  create: (input: CreateConversationInput) => apiRequest<Conversation>("/conversations", { method: "POST", body: JSON.stringify(input) }),
  update: ({ id, input }: { id: string; input: UpdateConversationInput }) => apiRequest<Conversation>(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  message: ({ id, input }: { id: string; leadId?: string; input: CreateMessageInput }) => apiRequest<ConversationMessage>(`/conversations/${id}/messages`, { method: "POST", body: JSON.stringify(input) }),
  retryMessage: ({ id, messageId }: { id: string; leadId?: string; messageId: string }) => apiRequest<ConversationMessage>(`/conversations/${id}/messages/${messageId}/retry`, { method: "POST" }),
  assign: ({ id, assignedStaffId }: { id: string; assignedStaffId: string | null }) => apiRequest<Conversation>(`/conversations/${id}/assign`, { method: "PATCH", body: JSON.stringify({ assignedStaffId }) }),
  updateStatus: ({ id, status }: { id: string; status: ConversationStatus }) => apiRequest<Conversation>(`/conversations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  markRead: (id: string) => apiRequest<Conversation>(`/conversations/${id}/read`, { method: "PATCH" }),
  remove: (id: string) => apiRequest<ApiMessage>(`/conversations/${id}`, { method: "DELETE" }),
};
