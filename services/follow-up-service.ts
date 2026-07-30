import { apiRequest } from "@/lib/api-client";
import { env } from "@/lib/env";
import { mockFollowUpService } from "@/services/mock-follow-up-service";
import type {
  AiPromptCreateDraftResponse,
  AiPromptListResponse,
  AiPromptVersion,
  FollowUpJob,
  FollowUpContextQuery,
  FollowUpListResponse,
  FollowUpLog,
  FollowUpRule,
  FollowUpSettings,
  UpdateFollowUpRuleInput,
  UpdateFollowUpSettingsInput,
} from "@/types/follow-up";

const query = (params: Record<string, string | number | boolean | null | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) search.set(key, String(value));
  const value = search.toString();
  return value ? `?${value}` : "";
};

export const followUpService = {
  settings: () => env.useMockApi ? mockFollowUpService.settings() : apiRequest<FollowUpSettings>("/business/follow-up/settings"),
  updateSettings: (input: UpdateFollowUpSettingsInput) => env.useMockApi
    ? mockFollowUpService.updateSettings(input)
    : apiRequest<FollowUpSettings>("/business/follow-up/settings", { method: "PATCH", body: JSON.stringify(input) }),
  rules: () => env.useMockApi
    ? mockFollowUpService.rules()
    : apiRequest<FollowUpListResponse<FollowUpRule>>(`/business/follow-up/rules${query({ includeLocked: true, limit: 50 })}`),
  updateRule: (ruleId: string, input: UpdateFollowUpRuleInput) => env.useMockApi
    ? mockFollowUpService.updateRule(ruleId, input)
    : apiRequest<FollowUpRule>(`/business/follow-up/rules/${ruleId}`, { method: "PATCH", body: JSON.stringify(input) }),
  jobs: (input: FollowUpContextQuery = {}) => env.useMockApi
    ? mockFollowUpService.jobs(input)
    : apiRequest<FollowUpListResponse<FollowUpJob>>(`/business/follow-up/jobs${query({ limit: input.limit ?? 10, leadId: input.leadId, conversationId: input.conversationId, appointmentId: input.appointmentId })}`),
  logs: (input: FollowUpContextQuery = {}) => env.useMockApi
    ? mockFollowUpService.logs(input)
    : apiRequest<FollowUpListResponse<FollowUpLog>>(`/business/follow-up/logs${query({ limit: input.limit ?? 10, leadId: input.leadId, conversationId: input.conversationId, appointmentId: input.appointmentId })}`),
  cancelJob: (jobId: string, reason?: string) => env.useMockApi
    ? mockFollowUpService.cancelJob(jobId, reason)
    : apiRequest<FollowUpJob>(`/business/follow-up/jobs/${jobId}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  retryJob: (jobId: string) => env.useMockApi
    ? mockFollowUpService.retryJob(jobId)
    : apiRequest<FollowUpJob>(`/business/follow-up/jobs/${jobId}/retry`, { method: "PATCH" }),
  aiPromptList: () => env.useMockApi
    ? mockFollowUpService.aiPromptList()
    : apiRequest<AiPromptListResponse>(`/business/ai-prompts${query({ scope: "FOLLOW_UP", limit: 1 })}`),
  createPromptDraft: (promptText: string) => env.useMockApi
    ? mockFollowUpService.createPromptDraft(promptText)
    : apiRequest<AiPromptCreateDraftResponse>("/business/ai-prompts", {
      method: "POST",
      body: JSON.stringify({
        scope: "FOLLOW_UP",
        name: "Follow-Up Automation",
        description: "Business-specific follow-up automation instructions.",
        promptText,
        changeSummary: "Created from Settings Center.",
      }),
    }),
  createPromptVersion: (configurationId: string, promptText: string) => env.useMockApi
    ? mockFollowUpService.createPromptVersion(configurationId, promptText)
    : apiRequest<AiPromptVersion>(`/business/ai-prompts/${configurationId}/versions`, {
      method: "POST",
      body: JSON.stringify({ promptText, changeSummary: "Updated from Settings Center." }),
    }),
  validatePromptVersion: (versionId: string) => env.useMockApi
    ? mockFollowUpService.validatePromptVersion(versionId)
    : apiRequest<AiPromptVersion>(`/business/ai-prompts/versions/${versionId}/validate`, { method: "POST" }),
  activatePromptVersion: (versionId: string) => env.useMockApi
    ? mockFollowUpService.activatePromptVersion(versionId)
    : apiRequest<AiPromptVersion>(`/business/ai-prompts/versions/${versionId}/activate`, { method: "POST" }),
};
