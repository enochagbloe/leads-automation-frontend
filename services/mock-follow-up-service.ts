import type {
  AiPromptConfiguration,
  AiPromptCreateDraftResponse,
  AiPromptListResponse,
  AiPromptVersion,
  FollowUpContextQuery,
  FollowUpJob,
  FollowUpListResponse,
  FollowUpLog,
  FollowUpRule,
  FollowUpSettings,
  UpdateFollowUpRuleInput,
  UpdateFollowUpSettingsInput,
} from "@/types/follow-up";

let settings: FollowUpSettings = { id: "mock-business", followUpAutomationEnabled: true };

let rules: FollowUpRule[] = [
  {
    id: "rule-no-response",
    businessId: "mock-business",
    type: "NO_RESPONSE_AFTER_MESSAGE",
    name: "No response follow-up",
    enabled: true,
    delayMinutes: 1440,
    messageTemplate: "Hi {{customerName}}, just checking if you’d still like help with this.",
    useAiRewrite: true,
    maxSendsPerLead: 2,
    maxSendsPerConversation: 2,
    cooldownMinutes: 1440,
    onlyDuringBusinessHours: true,
    planRequired: "BASIC",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-appointment",
    businessId: "mock-business",
    type: "BEFORE_APPOINTMENT",
    name: "Appointment reminder",
    enabled: true,
    delayMinutes: 1440,
    messageTemplate: "Reminder: your {{serviceName}} appointment is scheduled for {{appointmentDate}} at {{appointmentTime}}.",
    useAiRewrite: false,
    maxSendsPerLead: 1,
    maxSendsPerConversation: 1,
    onlyDuringBusinessHours: true,
    planRequired: "BASIC",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-stale",
    businessId: "mock-business",
    type: "STALE_LEAD",
    name: "Stale lead follow-up",
    enabled: false,
    delayMinutes: 4320,
    messageTemplate: "Hi, are you still interested in this service?",
    useAiRewrite: true,
    maxSendsPerLead: 1,
    maxSendsPerConversation: 1,
    onlyDuringBusinessHours: true,
    planRequired: "PLUS",
    updatedAt: new Date().toISOString(),
  },
];

let jobs: FollowUpJob[] = [
  {
    id: "job-1",
    ruleId: "rule-no-response",
    leadId: "lead-1",
    conversationId: "conversation-1",
    status: "SCHEDULED",
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    pendingQuestion: "Waiting for customer confirmation.",
    rule: rules[0],
  },
];

const logs: FollowUpLog[] = [
  {
    id: "log-1",
    ruleId: "rule-appointment",
    jobId: "job-sent",
    leadId: "lead-1",
    conversationId: "conversation-1",
    messagePreview: "Reminder: your appointment is scheduled for tomorrow.",
    deliveryStatus: "DELIVERED",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    rule: rules[1],
  },
];

let promptConfig: AiPromptConfiguration | null = {
  id: "follow-up-prompt",
  scope: "FOLLOW_UP",
  name: "Follow-Up Automation",
  status: "ACTIVE",
  activeVersionId: "follow-up-prompt-v1",
  latestVersionNumber: 1,
  activeVersion: {
    id: "follow-up-prompt-v1",
    configurationId: "follow-up-prompt",
    scope: "FOLLOW_UP",
    status: "ACTIVE",
    versionNumber: 1,
    revision: 1,
    promptText: "Keep follow-ups short, calm, and useful. Never pressure customers. Escalate custom pricing requests to staff.",
    activatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  versions: [],
};

function list<T>(data: T[], limit = 50): FollowUpListResponse<T> {
  return { data, pagination: { page: 1, limit, total: data.length, totalPages: 1 } };
}

function matchesContext(item: FollowUpJob | FollowUpLog, input: FollowUpContextQuery) {
  return (!input.leadId || item.leadId === input.leadId)
    && (!input.conversationId || item.conversationId === input.conversationId)
    && (!input.appointmentId || item.appointmentId === input.appointmentId);
}

export const mockFollowUpService = {
  settings: async () => settings,
  updateSettings: async (input: UpdateFollowUpSettingsInput) => {
    const cancelledJobCount = settings.followUpAutomationEnabled && !input.followUpAutomationEnabled ? jobs.filter((job) => job.status === "SCHEDULED").length : 0;
    settings = { ...settings, ...input, cancelledJobCount };
    return settings;
  },
  rules: async () => list(rules),
  updateRule: async (ruleId: string, input: UpdateFollowUpRuleInput) => {
    rules = rules.map((rule) => rule.id === ruleId ? { ...rule, ...input, updatedAt: new Date().toISOString() } : rule);
    return rules.find((rule) => rule.id === ruleId)!;
  },
  jobs: async (input: FollowUpContextQuery = {}) => list(jobs.filter((job) => matchesContext(job, input)), input.limit ?? 10),
  logs: async (input: FollowUpContextQuery = {}) => list(logs.filter((log) => matchesContext(log, input)), input.limit ?? 10),
  cancelJob: async (jobId: string, reason?: string) => {
    jobs = jobs.map((job) => job.id === jobId ? { ...job, status: "CANCELLED", cancelReason: reason ?? "Cancelled by user", updatedAt: new Date().toISOString() } : job);
    return jobs.find((job) => job.id === jobId)!;
  },
  retryJob: async (jobId: string) => {
    jobs = jobs.map((job) => job.id === jobId ? { ...job, status: "SCHEDULED", failureReason: null, scheduledFor: new Date(Date.now() + 1000 * 60 * 30).toISOString(), updatedAt: new Date().toISOString() } : job);
    return jobs.find((job) => job.id === jobId)!;
  },
  aiPromptList: async (): Promise<AiPromptListResponse> => ({ data: promptConfig ? [promptConfig] : [], total: promptConfig ? 1 : 0, page: 1, limit: 1 }),
  createPromptDraft: async (promptText: string): Promise<AiPromptCreateDraftResponse> => {
    const version: AiPromptVersion = {
      id: `follow-up-prompt-v${Date.now()}`,
      configurationId: "follow-up-prompt",
      scope: "FOLLOW_UP",
      status: "DRAFT",
      versionNumber: (promptConfig?.latestVersionNumber ?? 0) + 1,
      revision: 1,
      promptText,
    };
    promptConfig = {
      id: "follow-up-prompt",
      scope: "FOLLOW_UP",
      name: "Follow-Up Automation",
      status: "DRAFT",
      latestVersionNumber: version.versionNumber,
      versions: [version],
    };
    return { config: promptConfig, version };
  },
  createPromptVersion: async (_configurationId: string, promptText: string) => ({
    id: `follow-up-prompt-v${Date.now()}`,
    configurationId: "follow-up-prompt",
    scope: "FOLLOW_UP",
    status: "DRAFT",
    versionNumber: (promptConfig?.latestVersionNumber ?? 0) + 1,
    revision: 1,
    promptText,
  }) satisfies AiPromptVersion,
  validatePromptVersion: async (versionId: string) => ({ id: versionId, status: "VALID" }) as AiPromptVersion,
  activatePromptVersion: async (versionId: string) => {
    const activeVersion: AiPromptVersion = {
      id: versionId,
      configurationId: "follow-up-prompt",
      scope: "FOLLOW_UP",
      status: "ACTIVE",
      versionNumber: (promptConfig?.latestVersionNumber ?? 1),
      revision: 1,
      promptText: promptConfig?.versions?.[0]?.promptText ?? promptConfig?.activeVersion?.promptText ?? "",
      activatedAt: new Date().toISOString(),
    };
    promptConfig = { ...(promptConfig ?? { id: "follow-up-prompt", scope: "FOLLOW_UP", name: "Follow-Up Automation", status: "ACTIVE", latestVersionNumber: 1 }), status: "ACTIVE", activeVersionId: versionId, activeVersion };
    return activeVersion;
  },
};
