import { apiDateFrom, apiDateTo } from "@/lib/date-query";
import { env } from "@/lib/env";
import { apiRequest } from "@/lib/api-client";
import { mockCustomerIssueService } from "@/services/mock-customer-issue-service";
import type { CustomerIssue, CustomerIssueListQuery, CustomerIssueListResponse, UpdateCustomerIssueStatusInput } from "@/types/customer-issue";

function queryString(query: CustomerIssueListQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "" || key === "tab") continue;
    if (key === "dateFrom") params.set(key, apiDateFrom(String(value)));
    else if (key === "dateTo") params.set(key, apiDateTo(String(value)));
    else params.set(key, String(value));
  }
  return params.toString();
}

function normalizeListResponse(value: CustomerIssueListResponse | CustomerIssue[]): CustomerIssueListResponse {
  if (Array.isArray(value)) return { data: value };
  return { ...value, data: Array.isArray(value.data) ? value.data : [] };
}

export const customerIssueService = {
  list: (query: CustomerIssueListQuery = {}) => env.useMockApi
    ? mockCustomerIssueService.list(query)
    : apiRequest<CustomerIssueListResponse | CustomerIssue[]>(`/business/customer-issues?${queryString(query)}`).then(normalizeListResponse),
  detail: (issueId: string) => env.useMockApi
    ? mockCustomerIssueService.detail(issueId)
    : apiRequest<CustomerIssue>(`/business/customer-issues/${issueId}`),
  updateStatus: ({ issueId, input }: { issueId: string; input: UpdateCustomerIssueStatusInput }) => env.useMockApi
    ? mockCustomerIssueService.updateStatus(issueId, input)
    : apiRequest<CustomerIssue>(`/business/customer-issues/${issueId}/status`, { method: "PATCH", body: JSON.stringify(input) }),
};
