import { apiRequest } from "@/lib/api-client";
import { env } from "@/lib/env";
import { mockBusinessPolicyService } from "@/services/mock-business-policy-service";
import type { ApiMessage } from "@/types/auth";
import type { BusinessPoliciesQuery, BusinessPoliciesResponse, BusinessPolicy, BusinessPolicyInput, PoliciesSummary, UpdateBusinessPolicyInput } from "@/types/business-policy";

function queryString(query: BusinessPoliciesQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value));
  return params.toString();
}

export const businessPolicyService = {
  list: (query: BusinessPoliciesQuery) => env.useMockApi ? mockBusinessPolicyService.list(query) : apiRequest<BusinessPoliciesResponse>(`/business/policies?${queryString(query)}`),
  summary: () => env.useMockApi ? mockBusinessPolicyService.summary() : apiRequest<PoliciesSummary>("/business/policies/summary"),
  detail: (id: string) => env.useMockApi ? mockBusinessPolicyService.detail(id) : apiRequest<BusinessPolicy>(`/business/policies/${id}`),
  create: (input: BusinessPolicyInput) => env.useMockApi ? mockBusinessPolicyService.create(input) : apiRequest<BusinessPolicy>("/business/policies", { method: "POST", body: JSON.stringify(input) }),
  update: (variables: { id: string; input: UpdateBusinessPolicyInput }) => env.useMockApi ? mockBusinessPolicyService.update(variables) : apiRequest<BusinessPolicy>(`/business/policies/${variables.id}`, { method: "PATCH", body: JSON.stringify(variables.input) }),
  archive: (id: string) => env.useMockApi ? mockBusinessPolicyService.archive(id) : apiRequest<BusinessPolicy>(`/business/policies/${id}`, { method: "DELETE" }),
  restore: (id: string) => env.useMockApi ? mockBusinessPolicyService.restore(id) : apiRequest<BusinessPolicy>(`/business/policies/${id}/restore`, { method: "POST" }),
  reorder: (items: Array<{ id: string; displayOrder: number }>) => env.useMockApi ? mockBusinessPolicyService.reorder(items) : apiRequest<ApiMessage>("/business/policies/reorder", { method: "PATCH", body: JSON.stringify({ items }) }),
};
