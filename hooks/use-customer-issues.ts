"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { customerIssueService } from "@/services/customer-issue-service";
import type { CustomerIssueListQuery, UpdateCustomerIssueStatusInput } from "@/types/customer-issue";

export const useCustomerIssues = (businessId: string | null | undefined, query: CustomerIssueListQuery, enabled = true) => useQuery({
  queryKey: queryKeys.customerIssues.list(businessId ?? "", query),
  queryFn: () => customerIssueService.list(query),
  enabled: Boolean(businessId && enabled),
});

export const useCustomerIssue = (businessId: string | null | undefined, issueId: string | null | undefined, enabled = true) => useQuery({
  queryKey: queryKeys.customerIssues.detail(businessId ?? "", issueId ?? ""),
  queryFn: () => customerIssueService.detail(issueId ?? ""),
  enabled: Boolean(businessId && issueId && enabled),
});

export function useUpdateCustomerIssueStatus(businessId: string | null | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, status }: { issueId: string; status: UpdateCustomerIssueStatusInput["status"] }) => customerIssueService.updateStatus({ issueId, input: { status } }),
    onSuccess: async (issue) => {
      if (!businessId) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.customerIssues.business(businessId) }),
        client.invalidateQueries({ queryKey: queryKeys.customerIssues.detail(businessId, issue.id) }),
        client.invalidateQueries({ queryKey: queryKeys.notifications.business(businessId) }),
        client.invalidateQueries({ queryKey: queryKeys.notifications.counts(businessId) }),
      ]);
    },
  });
}
