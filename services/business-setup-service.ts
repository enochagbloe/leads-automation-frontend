import { apiRequest } from "@/lib/api-client";
import type { BusinessSetupStatus } from "@/types/business-setup";

export const businessSetupService = {
  status: () => apiRequest<BusinessSetupStatus>("/business/setup-status"),
};
