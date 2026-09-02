"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { onboardingService } from "@/services/onboarding-service";
import type { BusinessOnboardingInput } from "@/types/onboarding";

type OnboardingSaveStep = "profile" | "availability";

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const completedSteps = useRef(new Set<OnboardingSaveStep>());
  return useMutation({
    mutationFn: async (input: BusinessOnboardingInput) => {
      if (!completedSteps.current.has("profile")) {
        await onboardingService.configureProfile(input);
        completedSteps.current.add("profile");
      }
      if (!completedSteps.current.has("availability")) {
        await onboardingService.configureAvailability(input);
        completedSteps.current.add("availability");
      }
      return onboardingService.completeResult();
    },
    onSuccess: async () => {
      completedSteps.current.clear();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser }),
        queryClient.invalidateQueries({ queryKey: queryKeys.businessProfile.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.businessAvailability.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.businessSetup.all }),
      ]);
    },
  });
}
