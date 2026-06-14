"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { businessServiceService } from "@/services/business-service-service";
import type { BusinessService, BusinessServicesQuery } from "@/types/business-service";

export const useBusinessServices = (businessId: string | null | undefined, query: BusinessServicesQuery) => useQuery({
  queryKey: queryKeys.businessServices.list(businessId ?? "", query),
  queryFn: () => businessServiceService.list(query),
  enabled: Boolean(businessId),
});
export const useBusinessService = (businessId: string | null | undefined, id: string) => useQuery({ queryKey: queryKeys.businessServices.detail(businessId ?? "", id), queryFn: () => businessServiceService.detail(id), enabled: Boolean(businessId && id) });
export const useBusinessServicesSummary = (businessId?: string | null) => useQuery({ queryKey: queryKeys.businessServices.summary(businessId ?? ""), queryFn: businessServiceService.summary, enabled: Boolean(businessId) });

function useServiceMutation<TVariables>(businessId: string | null | undefined, mutationFn: (variables: TVariables) => Promise<BusinessService>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (service) => {
      if (businessId) client.setQueryData(queryKeys.businessServices.detail(businessId, service.id), service);
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.businessServices.all }),
        client.invalidateQueries({ queryKey: queryKeys.businessSetup.all }),
        client.invalidateQueries({ queryKey: queryKeys.auth.currentUser }),
      ]);
    },
  });
}

export const useCreateBusinessService = (businessId?: string | null) => useServiceMutation(businessId, businessServiceService.create);
export const useUpdateBusinessService = (businessId?: string | null) => useServiceMutation(businessId, businessServiceService.update);
export const useArchiveBusinessService = (businessId?: string | null) => useServiceMutation(businessId, businessServiceService.archive);
export const useRestoreBusinessService = (businessId?: string | null) => useServiceMutation(businessId, businessServiceService.restore);

export function useReorderBusinessServices(businessId?: string | null) {
  const client = useQueryClient();
  return useMutation({ mutationFn: businessServiceService.reorder, onSuccess: async () => Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.businessServices.all }),
    ...(businessId ? [client.invalidateQueries({ queryKey: queryKeys.businessServices.summary(businessId) })] : []),
    client.invalidateQueries({ queryKey: queryKeys.businessSetup.all }),
  ]) });
}
