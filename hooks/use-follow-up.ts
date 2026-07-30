"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { followUpService } from "@/services/follow-up-service";
import type { AiPromptListResponse, FollowUpContextQuery, FollowUpJob, FollowUpListResponse, FollowUpLog, FollowUpRule, FollowUpSettings, UpdateFollowUpRuleInput, UpdateFollowUpSettingsInput } from "@/types/follow-up";

export const followUpMutationKeys = {
  business: (businessId: string) => ["follow-up", "save", businessId] as const,
  settings: (businessId: string) => ["follow-up", "save", businessId, "settings"] as const,
  rule: (businessId: string) => ["follow-up", "save", businessId, "rule"] as const,
  prompt: (businessId: string) => ["follow-up", "save", businessId, "prompt"] as const,
};

export function useFollowUpSettings(businessId?: string | null) {
  return useQuery<FollowUpSettings>({
    queryKey: queryKeys.followUp.settings(businessId ?? ""),
    queryFn: followUpService.settings,
    enabled: Boolean(businessId),
  });
}

export function useFollowUpRules(businessId?: string | null) {
  return useQuery<FollowUpListResponse<FollowUpRule>>({
    queryKey: queryKeys.followUp.rules(businessId ?? ""),
    queryFn: followUpService.rules,
    enabled: Boolean(businessId),
  });
}

export function useFollowUpJobs(businessId?: string | null) {
  return useQuery<FollowUpListResponse<FollowUpJob>>({
    queryKey: queryKeys.followUp.jobs(businessId ?? ""),
    queryFn: () => followUpService.jobs(),
    enabled: Boolean(businessId),
    refetchInterval: businessId ? 30_000 : false,
  });
}

export function useFollowUpContextJobs(businessId?: string | null, input: FollowUpContextQuery = {}, enabled = true) {
  return useQuery<FollowUpListResponse<FollowUpJob>>({
    queryKey: queryKeys.followUp.contextJobs(businessId ?? "", input),
    queryFn: () => followUpService.jobs(input),
    enabled: Boolean(enabled && businessId && (input.leadId || input.conversationId || input.appointmentId)),
    refetchInterval: businessId ? 30_000 : false,
  });
}

export function useFollowUpLogs(businessId?: string | null) {
  return useQuery<FollowUpListResponse<FollowUpLog>>({
    queryKey: queryKeys.followUp.logs(businessId ?? ""),
    queryFn: () => followUpService.logs(),
    enabled: Boolean(businessId),
  });
}

export function useFollowUpContextLogs(businessId?: string | null, input: FollowUpContextQuery = {}, enabled = true) {
  return useQuery<FollowUpListResponse<FollowUpLog>>({
    queryKey: queryKeys.followUp.contextLogs(businessId ?? "", input),
    queryFn: () => followUpService.logs(input),
    enabled: Boolean(enabled && businessId && (input.leadId || input.conversationId || input.appointmentId)),
  });
}

export function useFollowUpPrompt(businessId?: string | null) {
  return useQuery<AiPromptListResponse>({
    queryKey: queryKeys.followUp.prompt(businessId ?? ""),
    queryFn: followUpService.aiPromptList,
    enabled: Boolean(businessId),
  });
}

function invalidateFollowUp(client: ReturnType<typeof useQueryClient>, businessId?: string | null) {
  void client.invalidateQueries({ queryKey: queryKeys.followUp.all });
  if (businessId) {
    void client.invalidateQueries({ queryKey: queryKeys.followUp.settings(businessId) });
    void client.invalidateQueries({ queryKey: queryKeys.followUp.rules(businessId) });
    void client.invalidateQueries({ queryKey: queryKeys.followUp.jobs(businessId) });
    void client.invalidateQueries({ queryKey: queryKeys.followUp.logs(businessId) });
    void client.invalidateQueries({ queryKey: queryKeys.followUp.prompt(businessId) });
  }
}

export function useUpdateFollowUpSettings(businessId?: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: followUpMutationKeys.settings(businessId ?? ""),
    mutationFn: (input: UpdateFollowUpSettingsInput) => followUpService.updateSettings(input),
    onMutate: async (input) => {
      if (!businessId) return {};
      const key = queryKeys.followUp.settings(businessId);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<FollowUpSettings>(key);
      client.setQueryData<FollowUpSettings>(key, (current) => ({
        ...(current ?? { id: businessId }),
        ...input,
      }));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (businessId && context?.previous) client.setQueryData(queryKeys.followUp.settings(businessId), context.previous);
    },
    onSettled: () => invalidateFollowUp(client, businessId),
  });
}

export function useUpdateFollowUpRule(businessId?: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: followUpMutationKeys.rule(businessId ?? ""),
    mutationFn: ({ ruleId, input }: { ruleId: string; input: UpdateFollowUpRuleInput }) => followUpService.updateRule(ruleId, input),
    onMutate: async ({ ruleId, input }) => {
      if (!businessId) return {};
      const key = queryKeys.followUp.rules(businessId);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<FollowUpListResponse<FollowUpRule>>(key);
      client.setQueryData<FollowUpListResponse<FollowUpRule>>(key, (current) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.map((rule) => rule.id === ruleId ? { ...rule, ...input } : rule),
        };
      });
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (businessId && context?.previous) client.setQueryData(queryKeys.followUp.rules(businessId), context.previous);
    },
    onSettled: () => invalidateFollowUp(client, businessId),
  });
}

export function useCancelFollowUpJob(businessId?: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason?: string }) => followUpService.cancelJob(jobId, reason),
    onSuccess: () => invalidateFollowUp(client, businessId),
  });
}

export function useRetryFollowUpJob(businessId?: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => followUpService.retryJob(jobId),
    onSuccess: () => invalidateFollowUp(client, businessId),
  });
}

export function useSaveFollowUpPrompt(businessId?: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: followUpMutationKeys.prompt(businessId ?? ""),
    mutationFn: async ({ configurationId, promptText }: { configurationId?: string; promptText: string }) => {
      const version = configurationId
        ? await followUpService.createPromptVersion(configurationId, promptText)
        : (await followUpService.createPromptDraft(promptText)).version;
      const validated = await followUpService.validatePromptVersion(version.id);
      return followUpService.activatePromptVersion(validated.id);
    },
    onSuccess: () => invalidateFollowUp(client, businessId),
  });
}
