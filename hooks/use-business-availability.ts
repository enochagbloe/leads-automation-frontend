"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { businessAvailabilityService } from "@/services/business-availability-service";

export const useBusinessAvailability = (businessId?: string | null) => useQuery({
  queryKey: queryKeys.businessAvailability.detail(businessId ?? ""),
  queryFn: businessAvailabilityService.get,
  enabled: Boolean(businessId),
});

export const useBusinessAvailabilitySummary = (businessId?: string | null) => useQuery({
  queryKey: queryKeys.businessAvailability.summary(businessId ?? ""),
  queryFn: businessAvailabilityService.summary,
  enabled: Boolean(businessId),
});

export function useUpdateBusinessAvailability(businessId?: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: businessAvailabilityService.update,
    onSuccess: async (availability) => {
      if (businessId) client.setQueryData(queryKeys.businessAvailability.detail(businessId), availability);
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.businessAvailability.all }),
        client.invalidateQueries({ queryKey: queryKeys.businessSetup.all }),
        client.invalidateQueries({ queryKey: queryKeys.businessProfile.all }),
      ]);
    },
  });
}
