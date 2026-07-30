import type { PlanCode } from "@/types/subscription";

export type FollowUpRuleType =
  | "NO_RESPONSE_AFTER_MESSAGE"
  | "CONTACT_EMAIL_REQUEST"
  | "BEFORE_APPOINTMENT"
  | "AFTER_APPOINTMENT"
  | "STALE_LEAD";

export type FollowUpJobStatus =
  | "SCHEDULED"
  | "PROCESSING"
  | "SENT"
  | "CANCELLED"
  | "FAILED"
  | "SKIPPED";

export type FollowUpDeliveryStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "INTERNAL"
  | string;

export interface FollowUpSettings {
  id: string;
  followUpAutomationEnabled: boolean;
  cancelledJobCount?: number;
}

export interface FollowUpRule {
  id: string;
  businessId: string;
  type: FollowUpRuleType;
  name: string;
  description?: string | null;
  enabled: boolean;
  delayMinutes: number;
  messageTemplate: string;
  useAiRewrite: boolean;
  maxSendsPerLead: number;
  maxSendsPerConversation: number;
  cooldownMinutes?: number | null;
  onlyDuringBusinessHours: boolean;
  planRequired?: PlanCode | null;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FollowUpJob {
  id: string;
  ruleId: string;
  leadId?: string | null;
  conversationId?: string | null;
  appointmentId?: string | null;
  contextType?: string | null;
  status: FollowUpJobStatus | string;
  scheduledFor?: string | null;
  sentAt?: string | null;
  cancelReason?: string | null;
  failureReason?: string | null;
  pendingQuestion?: string | null;
  createdAt?: string;
  updatedAt?: string;
  rule?: FollowUpRule;
  lead?: { id: string; fullName?: string | null };
  conversation?: { id: string; displayId?: string | null; subject?: string | null };
}

export interface FollowUpLog {
  id: string;
  ruleId?: string | null;
  jobId?: string | null;
  leadId?: string | null;
  conversationId?: string | null;
  appointmentId?: string | null;
  messagePreview?: string | null;
  deliveryStatus?: FollowUpDeliveryStatus;
  createdAt: string;
  sentAt?: string | null;
  rule?: FollowUpRule;
}

export type FollowUpContextQuery = {
  leadId?: string | null;
  conversationId?: string | null;
  appointmentId?: string | null;
  limit?: number;
};

export interface FollowUpListResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateFollowUpSettingsInput {
  followUpAutomationEnabled: boolean;
}

export type UpdateFollowUpRuleInput = Partial<Pick<
  FollowUpRule,
  | "name"
  | "description"
  | "enabled"
  | "delayMinutes"
  | "messageTemplate"
  | "useAiRewrite"
  | "maxSendsPerLead"
  | "maxSendsPerConversation"
  | "cooldownMinutes"
  | "onlyDuringBusinessHours"
>>;

export type AiPromptStatus = "DRAFT" | "VALIDATING" | "VALID" | "INVALID" | "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface AiPromptVersion {
  id: string;
  configurationId: string;
  scope: "FOLLOW_UP" | string;
  status: AiPromptStatus;
  versionNumber: number;
  promptText: string;
  changeSummary?: string | null;
  revision: number;
  validatedAt?: string | null;
  activatedAt?: string | null;
  updatedAt?: string;
  validationResult?: unknown;
}

export interface AiPromptConfiguration {
  id: string;
  scope: "FOLLOW_UP" | string;
  name: string;
  description?: string | null;
  status: AiPromptStatus;
  activeVersionId?: string | null;
  latestVersionNumber: number;
  activeVersion?: AiPromptVersion | null;
  versions?: AiPromptVersion[];
  updatedAt?: string;
}

export interface AiPromptListResponse {
  data: AiPromptConfiguration[];
  total: number;
  page: number;
  limit: number;
}

export interface AiPromptCreateDraftResponse {
  config: AiPromptConfiguration;
  version: AiPromptVersion;
}
