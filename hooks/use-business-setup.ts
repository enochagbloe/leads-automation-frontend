"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { businessSetupService } from "@/services/business-setup-service";

export const useBusinessSetupStatus = (businessId?: string | null) => useQuery({
  queryKey: queryKeys.businessSetup.status(businessId ?? ""),
  queryFn: businessSetupService.status,
  enabled: Boolean(businessId),
});
