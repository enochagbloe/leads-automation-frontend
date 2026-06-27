"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { businessService } from "@/services/business-service";

export function useBusinessMembers(businessId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.businessMembers.list(businessId ?? ""),
    queryFn: businessService.listMembers,
    enabled: Boolean(businessId) && enabled,
  });
}
