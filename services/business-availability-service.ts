import { apiRequest } from "@/lib/api-client";
import { env } from "@/lib/env";
import { mockBusinessAvailabilityService } from "@/services/mock-business-availability-service";
import type { AvailabilitySummary, BusinessAvailabilityResponse, UpdateBusinessAvailabilityInput } from "@/types/business-availability";

export const businessAvailabilityService = {
  get: () => env.useMockApi ? mockBusinessAvailabilityService.get() : apiRequest<BusinessAvailabilityResponse>("/business/availability"),
  summary: () => env.useMockApi ? mockBusinessAvailabilityService.summary() : apiRequest<AvailabilitySummary>("/business/availability/summary"),
  update: (input: UpdateBusinessAvailabilityInput) => env.useMockApi
    ? mockBusinessAvailabilityService.update(input)
    : apiRequest<BusinessAvailabilityResponse>("/business/availability", { method: "PUT", body: JSON.stringify(input) }),
};
