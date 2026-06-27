"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { leadService } from "@/services/lead-service";
import type { Lead, LeadListQuery } from "@/types/lead";

export const useLeads = (query: LeadListQuery, enabled = true) => useQuery({ queryKey: queryKeys.leads.list(query), queryFn: () => leadService.list(query), enabled });
export const useLead = (id: string) => useQuery({ queryKey: queryKeys.leads.detail(id), queryFn: () => leadService.detail(id), enabled: Boolean(id) });
export const useLeadStats = (enabled = true) => useQuery({ queryKey: queryKeys.leads.stats, queryFn: leadService.stats, enabled });

function useLeadMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Lead>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.leads.lists }),
        client.invalidateQueries({ queryKey: queryKeys.leads.stats }),
        ...((variables as { id?: string }).id ? [client.invalidateQueries({ queryKey: queryKeys.leads.detail((variables as { id: string }).id) })] : []),
      ]);
    },
  });
}

export function useCreateLead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: leadService.create,
    onSuccess: async () => Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.leads.lists }),
      client.invalidateQueries({ queryKey: queryKeys.leads.stats }),
    ]),
  });
}

export const useUpdateLead = () => useLeadMutation(leadService.update);
export const useAssignLead = () => useLeadMutation(leadService.assign);
export const useUpdateLeadStatus = () => useLeadMutation(leadService.updateStatus);

export function useClaimLead(activeBusinessId?: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: leadService.claim,
    onSuccess: async (lead) => Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.leads.lists }),
      client.invalidateQueries({ queryKey: queryKeys.leads.stats }),
      client.invalidateQueries({ queryKey: queryKeys.leads.detail(lead.id) }),
      ...(activeBusinessId ? [client.invalidateQueries({ queryKey: queryKeys.notifications.business(activeBusinessId) })] : []),
    ]),
  });
}

export function useDeleteLead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: leadService.remove,
    onSuccess: async (_data, id) => {
      client.removeQueries({ queryKey: queryKeys.leads.detail(id) });
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.leads.lists }),
        client.invalidateQueries({ queryKey: queryKeys.leads.stats }),
      ]);
    },
  });
}
