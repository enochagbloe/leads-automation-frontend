"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { conversationService } from "@/services/conversation-service";
import type { Conversation, ConversationListQuery } from "@/types/conversation";

const CONVERSATION_POLL_INTERVAL = 10_000;
const ACTIVE_CONVERSATION_POLL_INTERVAL = 5_000;

export const useConversations = (query: ConversationListQuery) => useQuery({
  queryKey: queryKeys.conversations.list(query),
  queryFn: () => conversationService.list(query),
  refetchInterval: CONVERSATION_POLL_INTERVAL,
  refetchIntervalInBackground: false,
});
export const useConversationStats = () => useQuery({
  queryKey: queryKeys.conversations.stats,
  queryFn: conversationService.stats,
  refetchInterval: CONVERSATION_POLL_INTERVAL,
  refetchIntervalInBackground: false,
});
export const useConversation = (id: string) => useInfiniteQuery({
  queryKey: queryKeys.conversations.detail(id),
  queryFn: ({ pageParam }) => conversationService.detail(id, pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (page) => page.messagePagination.nextBeforeMessageId ?? undefined,
  enabled: Boolean(id),
  refetchInterval: id ? ACTIVE_CONVERSATION_POLL_INTERVAL : false,
  refetchIntervalInBackground: false,
});

function useConversationMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Conversation>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (_data, variables) => Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.conversations.lists }),
      client.invalidateQueries({ queryKey: queryKeys.conversations.stats }),
      ...((variables as { id?: string }).id ? [client.invalidateQueries({ queryKey: queryKeys.conversations.detail((variables as { id: string }).id) })] : []),
    ]),
  });
}

export function useCreateConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: conversationService.create,
    onSuccess: async () => Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.conversations.lists }),
      client.invalidateQueries({ queryKey: queryKeys.conversations.stats }),
    ]),
  });
}

type MessageMutationVariables = { id: string; leadId?: string };

function useMessageMutation<TVariables extends MessageMutationVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    retry: false,
    onSuccess: async (_data, variables) => Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.conversations.lists }),
      client.invalidateQueries({ queryKey: queryKeys.conversations.stats }),
      client.invalidateQueries({ queryKey: queryKeys.conversations.detail(variables.id) }),
      ...(variables.leadId ? [client.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.leadId) })] : []),
    ]),
  });
}

export const useSendConversationMessage = () => useMessageMutation(conversationService.message);
export const useRetryConversationMessage = () => useMessageMutation(conversationService.retryMessage);
export const useSendMessage = useSendConversationMessage;

export const useAssignConversation = () => useConversationMutation(conversationService.assign);
export const useUpdateConversation = () => useConversationMutation(conversationService.update);
export const useUpdateConversationStatus = () => useConversationMutation(conversationService.updateStatus);
export const useEndConversation = () => useConversationMutation(conversationService.end);
export function useMarkConversationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: conversationService.markRead,
    onSuccess: async (_data, id) => Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.conversations.lists }),
      client.invalidateQueries({ queryKey: queryKeys.conversations.stats }),
      client.invalidateQueries({ queryKey: queryKeys.conversations.detail(id) }),
    ]),
  });
}

export function useDeleteConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: conversationService.remove,
    onSuccess: async (_data, id) => {
      client.removeQueries({ queryKey: queryKeys.conversations.detail(id) });
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.conversations.lists }),
        client.invalidateQueries({ queryKey: queryKeys.conversations.stats }),
      ]);
    },
  });
}
