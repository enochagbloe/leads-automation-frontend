import { apiRequest } from "@/lib/api-client";
import { env } from "@/lib/env";
import type { BusinessOnboardingInput, BusinessOnboardingResponse } from "@/types/onboarding";

export const onboardingService = {
  async complete(input: BusinessOnboardingInput): Promise<BusinessOnboardingResponse> {
    if (env.useMockApi) {
      await new Promise((resolve) => setTimeout(resolve, 2_200));
      return { message: "Business workspace created", businessId: "biz_demo" };
    }
    return apiRequest<BusinessOnboardingResponse>("/business/onboarding", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
