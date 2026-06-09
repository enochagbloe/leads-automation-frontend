"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { conversationService } from "@/services/conversation-service";
import type { Conversation, ConversationListQuery } from "@/types/conversation";

export const useConversations = (query: ConversationListQuery) => useQuery({ queryKey: queryKeys.conversations.list(query), queryFn: () => conversationService.list(query) });
export const useConversationStats = () => useQuery({ queryKey: queryKeys.conversations.stats, queryFn: conversationService.stats });
export const useConversation = (id: string) => useInfiniteQuery({
  queryKey: queryKeys.conversations.detail(id),
  queryFn: ({ pageParam }) => conversationService.detail(id, pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (page) => page.messagePagination.nextBeforeMessageId ?? undefined,
  enabled: Boolean(id),
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

export function useSendMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: conversationService.message,
    retry: false,
    onSuccess: async (_data, variables) => Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.conversations.lists }),
      client.invalidateQueries({ queryKey: queryKeys.conversations.stats }),
      client.invalidateQueries({ queryKey: queryKeys.conversations.detail(variables.id) }),
    ]),
  });
}

export const useAssignConversation = () => useConversationMutation(conversationService.assign);
export const useUpdateConversation = () => useConversationMutation(conversationService.update);
export const useUpdateConversationStatus = () => useConversationMutation(conversationService.updateStatus);
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
