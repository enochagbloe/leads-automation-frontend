import { apiRequest } from "@/lib/api-client";
import { env } from "@/lib/env";
import { mockBusinessServiceService } from "@/services/mock-business-service-service";
import type { ApiMessage } from "@/types/auth";
import type { BusinessService, BusinessServiceInput, BusinessServicesQuery, BusinessServicesResponse, ServicesSummary, UpdateBusinessServiceInput } from "@/types/business-service";

function queryString(query: BusinessServicesQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== "") params.set(key, String(value));
  return params.toString();
}

export const businessServiceService = {
  list: (query: BusinessServicesQuery) => env.useMockApi ? mockBusinessServiceService.list(query) : apiRequest<BusinessServicesResponse>(`/business/services?${queryString(query)}`),
  summary: () => env.useMockApi ? mockBusinessServiceService.summary() : apiRequest<ServicesSummary>("/business/services/summary"),
  detail: (id: string) => env.useMockApi ? mockBusinessServiceService.detail(id) : apiRequest<BusinessService>(`/business/services/${id}`),
  create: (input: BusinessServiceInput) => env.useMockApi ? mockBusinessServiceService.create(input) : apiRequest<BusinessService>("/business/services", { method: "POST", body: JSON.stringify(input) }),
  update: (variables: { id: string; input: UpdateBusinessServiceInput }) => env.useMockApi ? mockBusinessServiceService.update(variables) : apiRequest<BusinessService>(`/business/services/${variables.id}`, { method: "PATCH", body: JSON.stringify(variables.input) }),
  archive: (id: string) => env.useMockApi ? mockBusinessServiceService.archive(id) : apiRequest<BusinessService>(`/business/services/${id}`, { method: "DELETE" }),
  restore: (id: string) => env.useMockApi ? mockBusinessServiceService.restore(id) : apiRequest<BusinessService>(`/business/services/${id}/restore`, { method: "POST" }),
  reorder: (items: Array<{ id: string; displayOrder: number }>) => env.useMockApi ? mockBusinessServiceService.reorder(items) : apiRequest<ApiMessage>("/business/services/reorder", { method: "PATCH", body: JSON.stringify({ items }) }),
};
