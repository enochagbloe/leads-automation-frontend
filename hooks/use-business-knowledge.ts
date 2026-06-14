"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { businessKnowledgeService } from "@/services/business-knowledge-service";

export const useBusinessKnowledgePreview = (businessId?: string | null, enabled = true) => useQuery({
  queryKey: queryKeys.businessKnowledge.detail(businessId ?? ""),
  queryFn: businessKnowledgeService.get,
  enabled: Boolean(businessId && enabled),
});
