"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { authService } from "@/services/auth-service";

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.currentUser,
    queryFn: authService.currentUser,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({ mutationFn: authService.login, onSuccess: (data) => client.setQueryData(queryKeys.auth.currentUser, data) });
}
export const useRegister = () => useMutation({ mutationFn: authService.register });
export const useVerifyEmail = () => useMutation({ mutationFn: authService.verifyEmail });
export const useResendVerification = () => useMutation({ mutationFn: authService.resendVerification });
export const useForgotPassword = () => useMutation({ mutationFn: authService.forgotPassword });
export const useResetPassword = () => useMutation({ mutationFn: authService.resetPassword });

export function useLogout() {
  const client = useQueryClient();
  return useMutation({ mutationFn: authService.logout, onSettled: () => client.removeQueries({ queryKey: queryKeys.auth.currentUser }) });
}
