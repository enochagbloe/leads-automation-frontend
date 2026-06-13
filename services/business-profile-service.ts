import { apiRequest } from "@/lib/api-client";
import type { BusinessProfile, UpdateBusinessProfileInput } from "@/types/business-profile";

export const businessProfileService = {
  get: () => apiRequest<BusinessProfile>("/business/profile"),
  update: (input: UpdateBusinessProfileInput) => apiRequest<BusinessProfile>("/business/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  }),
};
