export type RealtimeConnectionState = "connecting" | "connected" | "disconnected" | "error";

export type RealtimeEvent = {
  id: string;
  type: string;
  businessId: string;
  conversationId?: string;
  leadId?: string;
  messageId?: string;
  createdAt: string;
  payload: Record<string, unknown>;
};
