"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { onboardingService } from "@/services/onboarding-service";

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: onboardingService.complete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser }),
  });
}
