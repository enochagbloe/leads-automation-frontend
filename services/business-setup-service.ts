import { apiRequest } from "@/lib/api-client";
import { env } from "@/lib/env";
import { mockBusinessSetupService } from "@/services/mock-business-setup-service";
import type { BusinessSetupStatus } from "@/types/business-setup";

export const businessSetupService = {
  status: () => env.useMockApi
    ? mockBusinessSetupService.status()
    : apiRequest<BusinessSetupStatus>("/business/setup-status"),
};
