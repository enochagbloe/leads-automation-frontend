"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resetBusinessContext } from "@/lib/business-query-cache";
import { queryKeys } from "@/lib/query-keys";
import { systemNotify } from "@/lib/system-notifications";
import { businessService } from "@/services/business-service";

export const useBusinesses = () => useQuery({ queryKey: queryKeys.businesses.all, queryFn: businessService.listMemberships });
export const useInviteMember = () => useMutation({ mutationFn: businessService.inviteMember });
export const useAcceptInvitation = () => useMutation({ mutationFn: businessService.acceptInvitation });
export const useCreateBusiness = () => useMutation({ mutationFn: businessService.create });
export const useSwitchBusiness = () => useMutation({ mutationFn: businessService.switchBusiness });

export function useSelectBusiness() {
  const client = useQueryClient();
  const switchBusiness = useSwitchBusiness();
  return (businessId: string) => {
    switchBusiness.mutate(businessId, {
      onSuccess: async () => {
        await resetBusinessContext(client);
      },
      onError: (error) => {
        systemNotify.error("Could not switch business", { description: error instanceof Error ? error.message : "Please try again." });
      },
    });
  };
}
