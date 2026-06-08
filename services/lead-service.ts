import { apiRequest } from "@/lib/api-client";
import type { ApiMessage } from "@/types/auth";
import type { Lead, LeadDetailResponse, LeadInput, LeadListQuery, LeadListResponse, LeadStats, LeadStatus, UpdateLeadInput } from "@/types/lead";

function queryString(query: LeadListQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export const leadService = {
  list: (query: LeadListQuery) => apiRequest<LeadListResponse>(`/leads?${queryString(query)}`),
  stats: () => apiRequest<LeadStats>("/leads/stats"),
  detail: (id: string) => apiRequest<LeadDetailResponse>(`/leads/${id}`),
  create: (input: LeadInput) => apiRequest<Lead>("/leads", { method: "POST", body: JSON.stringify(input) }),
  update: ({ id, input }: { id: string; input: UpdateLeadInput }) => apiRequest<Lead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  assign: ({ id, assignedStaffId }: { id: string; assignedStaffId: string | null }) => apiRequest<Lead>(`/leads/${id}/assign`, { method: "PATCH", body: JSON.stringify({ assignedStaffId }) }),
  updateStatus: ({ id, status }: { id: string; status: LeadStatus }) => apiRequest<Lead>(`/leads/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  remove: (id: string) => apiRequest<ApiMessage>(`/leads/${id}`, { method: "DELETE" }),
};
