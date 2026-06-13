"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { whatsappService } from "@/services/whatsapp-service";

export const useWhatsAppStatus = (businessId?: string | null) => useQuery({
  queryKey: queryKeys.whatsapp.status(businessId ?? ""),
  queryFn: whatsappService.status,
  enabled: Boolean(businessId),
});

export const useWhatsAppHealth = (businessId?: string | null) => useQuery({
  queryKey: queryKeys.whatsapp.health(businessId ?? ""),
  queryFn: whatsappService.health,
  enabled: Boolean(businessId),
});

function useWhatsAppMutation<TVariables>(businessId: string | undefined | null, mutationFn: (variables: TVariables) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.whatsapp.all }),
      client.invalidateQueries({ queryKey: queryKeys.businessSetup.all }),
      client.invalidateQueries({ queryKey: queryKeys.conversations.all }),
      ...(businessId ? [
        client.invalidateQueries({ queryKey: queryKeys.whatsapp.status(businessId) }),
        client.invalidateQueries({ queryKey: queryKeys.whatsapp.health(businessId) }),
      ] : []),
    ]),
  });
}

export const useStartWhatsAppConnection = (businessId?: string | null) => useWhatsAppMutation(businessId, whatsappService.start);
export const useCompleteWhatsAppConnection = (businessId?: string | null) => useWhatsAppMutation(businessId, whatsappService.complete);
export const useDeactivateWhatsAppConnection = (businessId?: string | null) => useWhatsAppMutation(businessId, whatsappService.deactivate);
export const useStartWhatsAppNumberChange = (businessId?: string | null) => useWhatsAppMutation(businessId, whatsappService.startChange);
