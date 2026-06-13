"use client";

import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { env } from "@/lib/env";
import { queryKeys } from "@/lib/query-keys";
import { tokenStore } from "@/lib/token-store";
import type { Conversation, ConversationDetailResponse, ConversationListResponse, MessageDeliveryStatus } from "@/types/conversation";
import type { RealtimeConnectionState, RealtimeEvent } from "@/types/realtime";

const RealtimeContext = createContext<RealtimeConnectionState>("disconnected");
const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000, 15_000];

function isRealtimeEvent(value: unknown): value is RealtimeEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<RealtimeEvent>;
  return typeof event.id === "string"
    && typeof event.type === "string"
    && typeof event.businessId === "string"
    && typeof event.createdAt === "string"
    && Boolean(event.payload && typeof event.payload === "object");
}

function patchConversation(client: QueryClient, conversationId: string, changes: Partial<Conversation>) {
  client.setQueriesData<ConversationListResponse>({ queryKey: queryKeys.conversations.lists }, (current) => {
    if (!current) return current;
    return { ...current, data: current.data.map((conversation) => conversation.id === conversationId ? { ...conversation, ...changes } : conversation) };
  });
  client.setQueryData<InfiniteData<ConversationDetailResponse>>(queryKeys.conversations.detail(conversationId), (current) => {
    if (!current) return current;
    return { ...current, pages: current.pages.map((page) => ({ ...page, conversation: { ...page.conversation, ...changes } })) };
  });
}

function patchMessageStatus(client: QueryClient, conversationId: string, messageId: string, payload: Record<string, unknown>) {
  const newStatus = payload.newStatus;
  if (!["PENDING", "SENT", "DELIVERED", "READ", "FAILED"].includes(String(newStatus))) return;
  client.setQueryData<InfiniteData<ConversationDetailResponse>>(queryKeys.conversations.detail(conversationId), (current) => {
    if (!current) return current;
    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        messages: page.messages.map((message) => message.id === messageId ? {
          ...message,
          deliveryStatus: newStatus as MessageDeliveryStatus,
          readAt: typeof payload.readAt === "string" ? payload.readAt : message.readAt,
          updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : message.updatedAt,
        } : message),
      })),
    };
  });
}

async function invalidateRealtimeState(client: QueryClient, conversationId?: string, leadId?: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.conversations.lists }),
    client.invalidateQueries({ queryKey: queryKeys.conversations.stats }),
    ...(conversationId ? [client.invalidateQueries({ queryKey: queryKeys.conversations.detail(conversationId) })] : []),
    ...(leadId ? [client.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) })] : []),
  ]);
}

function applyEvent(client: QueryClient, event: RealtimeEvent) {
  const { conversationId, leadId, messageId, payload, type } = event;
  if (type === "message.status.updated" && conversationId && messageId) {
    patchMessageStatus(client, conversationId, messageId, payload);
    return;
  }

  if (["conversation.updated", "conversation.read", "conversation.unread_count.updated"].includes(type) && conversationId) {
    const changes = type === "conversation.updated" && payload.changes && typeof payload.changes === "object"
      ? payload.changes as Partial<Conversation>
      : { unreadCount: typeof payload.unreadCount === "number" ? payload.unreadCount : 0 };
    patchConversation(client, conversationId, changes);
    void client.invalidateQueries({ queryKey: queryKeys.conversations.stats });
    return;
  }

  if (["message.created", "conversation.created", "conversation.closed", "conversation.reopened", "conversation.assigned"].includes(type)) {
    void invalidateRealtimeState(client, conversationId, leadId);
    return;
  }

  if (["lead.created", "lead.updated"].includes(type)) {
    void Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.leads.lists }),
      client.invalidateQueries({ queryKey: queryKeys.leads.stats }),
      ...(leadId ? [client.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) })] : []),
    ]);
    return;
  }

  if (["whatsapp.connection.updated", "whatsapp.connection.deactivated", "whatsapp.connection.error"].includes(type)) {
    void Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.whatsapp.all }),
      client.invalidateQueries({ queryKey: queryKeys.conversations.all }),
    ]);
  }
}

function parseEventBlock(block: string) {
  let eventType = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) eventType = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  return { eventType, data: data.join("\n") };
}

export function RealtimeProvider({ activeBusinessId, enabled = true, children }: { activeBusinessId?: string | null; enabled?: boolean; children: React.ReactNode }) {
  const client = useQueryClient();
  const [status, setStatus] = useState<RealtimeConnectionState>("disconnected");

  const recoverMissedEvents = useCallback(async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.conversations.all }),
      client.invalidateQueries({ queryKey: queryKeys.leads.all }),
    ]);
  }, [client]);

  useEffect(() => {
    if (!enabled || !activeBusinessId || env.useMockApi) {
      return;
    }

    let stopped = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const connect = async () => {
      const accessToken = tokenStore.getAccessToken();
      if (!accessToken || stopped) {
        setStatus("disconnected");
        return;
      }

      controller = new AbortController();
      setStatus(reconnectAttempt ? "disconnected" : "connecting");
      try {
        const response = await fetch(`${env.apiUrl}/realtime/events`, {
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${accessToken}`,
            "X-Business-Id": activeBusinessId,
          },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`Realtime stream failed with status ${response.status}`);

        setStatus("connected");
        reconnectAttempt = 0;
        void recoverMissedEvents();
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replaceAll("\r\n", "\n");
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            const { eventType, data } = parseEventBlock(block);
            if (eventType === "connected" || eventType === "ping" || !data) continue;
            try {
              const event: unknown = JSON.parse(data);
              if (isRealtimeEvent(event) && event.businessId === activeBusinessId) applyEvent(client, event);
            } catch {
              // Ignore malformed or forward-compatible events; polling remains the recovery path.
            }
          }
        }
        if (!stopped) throw new Error("Realtime stream closed");
      } catch (error) {
        if (stopped || (error instanceof DOMException && error.name === "AbortError")) return;
        setStatus("error");
      }

      if (!stopped) {
        const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
        reconnectAttempt += 1;
        reconnectTimer = setTimeout(() => void connect(), delay);
      }
    };

    void connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      controller?.abort();
    };
  }, [activeBusinessId, client, enabled, recoverMissedEvents]);

  const value = useMemo(() => enabled && activeBusinessId && !env.useMockApi ? status : "disconnected", [activeBusinessId, enabled, status]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeConnectionStatus() {
  return useContext(RealtimeContext);
}

export function useRealtimeEvents() {
  return useRealtimeConnectionStatus();
}
