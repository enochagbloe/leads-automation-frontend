"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { businessProfileService } from "@/services/business-profile-service";

export const useBusinessProfile = (businessId?: string | null) => useQuery({
  queryKey: queryKeys.businessProfile.detail(businessId ?? ""),
  queryFn: businessProfileService.get,
  enabled: Boolean(businessId),
});

export function useUpdateBusinessProfile(businessId?: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: businessProfileService.update,
    onSuccess: async (profile) => {
      if (businessId) client.setQueryData(queryKeys.businessProfile.detail(businessId), profile);
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.businessProfile.all }),
        client.invalidateQueries({ queryKey: queryKeys.businessSetup.all }),
        client.invalidateQueries({ queryKey: queryKeys.auth.currentUser }),
      ]);
    },
  });
}
