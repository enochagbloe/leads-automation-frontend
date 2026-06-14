"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { businessPolicyService } from "@/services/business-policy-service";
import type { BusinessPoliciesQuery, BusinessPolicy } from "@/types/business-policy";

export const useBusinessPolicies = (businessId: string | null | undefined, query: BusinessPoliciesQuery) => useQuery({
  queryKey: queryKeys.businessPolicies.list(businessId ?? "", query),
  queryFn: () => businessPolicyService.list(query),
  enabled: Boolean(businessId),
});
export const useBusinessPolicy = (businessId: string | null | undefined, id: string) => useQuery({ queryKey: queryKeys.businessPolicies.detail(businessId ?? "", id), queryFn: () => businessPolicyService.detail(id), enabled: Boolean(businessId && id) });
export const useBusinessPoliciesSummary = (businessId?: string | null) => useQuery({ queryKey: queryKeys.businessPolicies.summary(businessId ?? ""), queryFn: businessPolicyService.summary, enabled: Boolean(businessId) });

function usePolicyMutation<TVariables>(businessId: string | null | undefined, mutationFn: (variables: TVariables) => Promise<BusinessPolicy>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (policy) => {
      if (businessId) client.setQueryData(queryKeys.businessPolicies.detail(businessId, policy.id), policy);
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.businessPolicies.all }),
        client.invalidateQueries({ queryKey: queryKeys.businessSetup.all }),
        client.invalidateQueries({ queryKey: queryKeys.auth.currentUser }),
      ]);
    },
  });
}

export const useCreateBusinessPolicy = (businessId?: string | null) => usePolicyMutation(businessId, businessPolicyService.create);
export const useUpdateBusinessPolicy = (businessId?: string | null) => usePolicyMutation(businessId, businessPolicyService.update);
export const useArchiveBusinessPolicy = (businessId?: string | null) => usePolicyMutation(businessId, businessPolicyService.archive);
export const useRestoreBusinessPolicy = (businessId?: string | null) => usePolicyMutation(businessId, businessPolicyService.restore);

export function useReorderBusinessPolicies() {
  const client = useQueryClient();
  return useMutation({ mutationFn: businessPolicyService.reorder, onSuccess: async () => Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.businessPolicies.all }),
    client.invalidateQueries({ queryKey: queryKeys.businessSetup.all }),
  ]) });
}
