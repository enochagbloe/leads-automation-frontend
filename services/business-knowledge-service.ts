import { apiRequest } from "@/lib/api-client";
import { env } from "@/lib/env";
import { mockBusinessKnowledgeService } from "@/services/mock-business-knowledge-service";
import type { BusinessKnowledgePreview } from "@/types/business-knowledge";

export const businessKnowledgeService = {
  get: () => env.useMockApi
    ? mockBusinessKnowledgeService.get()
    : apiRequest<BusinessKnowledgePreview>("/business/knowledge-preview"),
};
