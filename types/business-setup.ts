import type { PlanCode } from "@/types/subscription";

export type BusinessReadinessStatus = "NOT_STARTED" | "INCOMPLETE" | "READY_FOR_MANUAL_INBOX" | "READY_FOR_AI_AUTOMATION";
export type SetupRequiredFor = "MANUAL_INBOX" | "AI_AUTOMATION" | string;

export interface BusinessSetupItem {
  key: string;
  label: string;
  description?: string;
  route: string;
  requiredFor: SetupRequiredFor;
  planRequired?: PlanCode;
}

export interface BusinessSetupStatus {
  businessId: string;
  plan: PlanCode;
  completionPercentage: number;
  readinessStatus: BusinessReadinessStatus;
  isManualInboxReady: boolean;
  isAiReady: boolean;
  missingItems: BusinessSetupItem[];
  completedItems: Array<{ key: string; label: string }>;
  nextRecommendedStep: { key: string; label: string; route: string } | null;
}
