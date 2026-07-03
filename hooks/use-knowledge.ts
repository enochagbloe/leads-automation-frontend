"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { knowledgeService } from "@/services/knowledge-service";
import type {
  DraftKnowledgeArticleInput,
  KnowledgeDraftStreamHandlers,
  GenerateStarterArticlesInput,
  KnowledgeArticleInput,
  KnowledgeArticleStatus,
  KnowledgeDocumentInput,
  KnowledgeDocumentStatus,
  KnowledgeListQuery,
  KnowledgeSendInput,
  UpdateKnowledgeArticleInput,
} from "@/types/knowledge";

export const useKnowledgeArticles = (businessId?: string | null, query: KnowledgeListQuery = {}) => useQuery({
  queryKey: queryKeys.knowledgeArticles.list(businessId ?? "", query),
  queryFn: () => knowledgeService.articles(query),
  enabled: Boolean(businessId),
});

export const useKnowledgeDocuments = (businessId?: string | null, query: KnowledgeListQuery = {}) => useQuery({
  queryKey: queryKeys.knowledgeDocuments.list(businessId ?? "", query),
  queryFn: () => knowledgeService.documents(query),
  enabled: Boolean(businessId),
});

export const useKnowledgeSearch = (businessId?: string | null, conversationId?: string, query = "") => useQuery({
  queryKey: queryKeys.knowledgeSearch.results(businessId ?? "", conversationId, query),
  queryFn: () => knowledgeService.search({ query, conversationId }),
  enabled: Boolean(businessId),
});

function useInvalidateKnowledge() {
  const client = useQueryClient();
  return async (conversationId?: string) => Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.knowledgeArticles.all }),
    client.invalidateQueries({ queryKey: queryKeys.knowledgeDocuments.all }),
    client.invalidateQueries({ queryKey: queryKeys.knowledgeSearch.all }),
    client.invalidateQueries({ queryKey: queryKeys.businessKnowledge.all }),
    ...(conversationId ? [client.invalidateQueries({ queryKey: queryKeys.conversations.detail(conversationId) })] : []),
    ...(conversationId ? [client.invalidateQueries({ queryKey: queryKeys.conversations.lists })] : []),
    ...(conversationId ? [client.invalidateQueries({ queryKey: queryKeys.conversations.stats })] : []),
  ]);
}

export function useCreateKnowledgeArticle() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({ mutationFn: (input: KnowledgeArticleInput) => knowledgeService.createArticle(input), onSuccess: () => invalidate() });
}

export function useUpdateKnowledgeArticle() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({ mutationFn: (variables: { id: string; input: UpdateKnowledgeArticleInput }) => knowledgeService.updateArticle(variables), onSuccess: () => invalidate() });
}

export function useUpdateKnowledgeArticleStatus() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({ mutationFn: (variables: { id: string; status: KnowledgeArticleStatus }) => knowledgeService.updateArticleStatus(variables), onSuccess: () => invalidate() });
}

export function useGenerateStarterArticles() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({ mutationFn: (input: GenerateStarterArticlesInput) => knowledgeService.generateStarter(input), onSuccess: () => invalidate() });
}

export function useDraftKnowledgeArticle() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({ mutationFn: (input: DraftKnowledgeArticleInput) => knowledgeService.draftArticle(input), onSuccess: () => invalidate() });
}

export function useStreamDraftKnowledgeArticle() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (variables: { input: DraftKnowledgeArticleInput; handlers?: KnowledgeDraftStreamHandlers }) => knowledgeService.streamDraftArticle(variables.input, variables.handlers),
    onSuccess: () => invalidate(),
  });
}

export function useUploadKnowledgeDocument() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({ mutationFn: (input: KnowledgeDocumentInput & { file: File }) => knowledgeService.uploadDocument(input), onSuccess: () => invalidate() });
}

export function useUpdateKnowledgeDocumentStatus() {
  const invalidate = useInvalidateKnowledge();
  return useMutation({ mutationFn: (variables: { id: string; status: KnowledgeDocumentStatus }) => knowledgeService.updateDocumentStatus(variables), onSuccess: () => invalidate() });
}

export function useSendKnowledgeAsset(conversationId: string) {
  const invalidate = useInvalidateKnowledge();
  return useMutation({
    mutationFn: (input: KnowledgeSendInput) => knowledgeService.send({ conversationId, input }),
    onSuccess: () => invalidate(conversationId),
  });
}
