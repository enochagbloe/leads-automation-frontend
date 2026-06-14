"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resetBusinessContext } from "@/lib/business-query-cache";
import { businessStore } from "@/lib/business-store";
import { queryKeys } from "@/lib/query-keys";
import { businessService } from "@/services/business-service";

export const useBusinesses = () => useQuery({ queryKey: queryKeys.businesses.all, queryFn: businessService.listMemberships });
export const useInviteMember = () => useMutation({ mutationFn: businessService.inviteMember });
export const useAcceptInvitation = () => useMutation({ mutationFn: businessService.acceptInvitation });
export const useCreateBusiness = () => useMutation({ mutationFn: businessService.create });

export function useSelectBusiness() {
  const client = useQueryClient();
  return (businessId: string) => {
    if (businessStore.get() === businessId) return;
    businessStore.set(businessId);
    void resetBusinessContext(client);
  };
}
