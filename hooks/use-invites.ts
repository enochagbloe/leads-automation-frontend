"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resetBusinessContext } from "@/lib/business-query-cache";
import { queryKeys } from "@/lib/query-keys";
import { inviteService } from "@/services/invite-service";
import type { SignupFromInviteInput } from "@/types/auth";

export const useInviteByToken = (token: string) => useQuery({
  queryKey: queryKeys.invites.detail(token),
  queryFn: () => inviteService.getByToken(token),
  retry: false,
  enabled: Boolean(token),
});

export function useSignupFromInvite(token: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SignupFromInviteInput) => inviteService.signup(token, input),
    onSuccess: async () => {
      await resetBusinessContext(client);
      await client.invalidateQueries({ queryKey: queryKeys.businesses.all });
      await client.invalidateQueries({ queryKey: queryKeys.invites.detail(token) });
    },
  });
}

export function useAcceptInvite(token: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => inviteService.accept(token),
    onSuccess: async () => {
      await resetBusinessContext(client);
      await client.invalidateQueries({ queryKey: queryKeys.businesses.all });
      await client.invalidateQueries({ queryKey: queryKeys.invites.detail(token) });
    },
  });
}
