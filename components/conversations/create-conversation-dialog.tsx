"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquarePlus, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { systemNotify } from "@/lib/system-notifications";
import { AppButton } from "@/components/app-button";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { useCreateConversation } from "@/hooks/use-conversations";
import { useLeads } from "@/hooks/use-leads";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { CONVERSATION_CHANNEL_LABELS, CONVERSATION_CHANNELS, CONVERSATION_PRIORITIES, CONVERSATION_PRIORITY_LABELS } from "@/lib/conversations";
import { createConversationFormSchema, type CreateConversationFormValues } from "@/schemas/conversation";

export function CreateConversationDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: string) => void }) {
  const leads = useLeads({ page: 1, limit: 100, sortBy: "updatedAt", sortOrder: "desc" });
  const create = useCreateConversation();
  const form = useForm<CreateConversationFormValues>({ resolver: zodResolver(createConversationFormSchema), defaultValues: { leadId: "", subject: "", channel: "MANUAL", priority: "NORMAL" } });

  const submit = form.handleSubmit((values) => create.mutate(
    { leadId: values.leadId, subject: values.subject.trim() || null, channel: values.channel, priority: values.priority },
    {
      onSuccess: (conversation) => {
        systemNotify.success("Conversation created");
        form.reset();
        onOpenChange(false);
        onCreated(conversation.id);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === "CONVERSATION_ALREADY_EXISTS") {
          const conversationId = (error.details as unknown as Record<string, unknown> | undefined)?.conversationId;
          systemNotify.error("An active conversation already exists for this lead and channel.");
          if (typeof conversationId === "string") {
            onOpenChange(false);
            onCreated(conversationId);
          }
          return;
        }
        applyApiFieldErrors(error, form.setError);
        systemNotify.error("Could not create conversation", { description: getApiErrorMessage(error) });
      },
    },
  ));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-foreground/35 backdrop-blur-[2px]" />
        <Dialog.Content className="global-search-dialog fixed left-1/2 top-1/2 z-[90] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-5 shadow-[0_24px_80px_rgba(20,35,27,0.22)] outline-none sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><Dialog.Title className="text-lg font-bold">Start a conversation</Dialog.Title><Dialog.Description className="mt-1 text-sm leading-6 text-muted-foreground">Create a stored manual conversation for an existing lead.</Dialog.Description></div>
            <Dialog.Close asChild><AppButton size="icon" variant="ghost" aria-label="Close create conversation"><X className="size-4" /></AppButton></Dialog.Close>
          </div>
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <Controller name="leadId" control={form.control} render={({ field }) => <AppFormField id="conversation-lead" label="Lead" error={form.formState.errors.leadId?.message} required><AppSelect id="conversation-lead" value={field.value} onValueChange={field.onChange} options={(leads.data?.data ?? []).map((lead) => ({ value: lead.id, label: lead.fullName, description: lead.email ?? lead.phone }))} placeholder={leads.isPending ? "Loading leads..." : "Select a lead"} disabled={leads.isPending} /></AppFormField>} />
            <AppFormField id="conversation-subject" label="Subject" hint="Optional context for the team." error={form.formState.errors.subject?.message}><AppInput id="conversation-subject" placeholder="Property inquiry" {...form.register("subject")} /></AppFormField>
            <Controller name="channel" control={form.control} render={({ field }) => <AppFormField id="conversation-channel" label="Channel" required><AppSelect id="conversation-channel" value={field.value} onValueChange={field.onChange} options={CONVERSATION_CHANNELS.map((channel) => ({ value: channel, label: CONVERSATION_CHANNEL_LABELS[channel], disabled: channel !== "MANUAL" }))} /></AppFormField>} />
            <Controller name="priority" control={form.control} render={({ field }) => <AppFormField id="conversation-priority" label="Priority" required><AppSelect id="conversation-priority" value={field.value} onValueChange={field.onChange} options={CONVERSATION_PRIORITIES.map((priority) => ({ value: priority, label: CONVERSATION_PRIORITY_LABELS[priority] }))} /></AppFormField>} />
            <div className="flex justify-end gap-3 border-t pt-5"><Dialog.Close asChild><AppButton variant="ghost">Cancel</AppButton></Dialog.Close><AppButton type="submit" loading={create.isPending} loadingText="Creating"><MessageSquarePlus className="size-4" />Create conversation</AppButton></div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
