"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppButton } from "@/components/app-button";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCreateLead, useUpdateLead } from "@/hooks/use-leads";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/leads";
import { leadFormSchema, type LeadFormValues } from "@/schemas/lead";
import type { Lead, LeadInput } from "@/types/lead";

function toInput(values: LeadFormValues): LeadInput {
  return {
    fullName: values.fullName.trim(),
    phone: values.phone.trim(),
    email: values.email.trim() || null,
    source: values.source,
    status: values.status,
    assignedStaffId: values.assignedStaffId || null,
    notes: values.notes.trim() || null,
    tags: [...new Set(values.tagsText.split(",").map((tag) => tag.trim()).filter(Boolean))],
    customFields: values.customFieldsText.trim() ? JSON.parse(values.customFieldsText) as Record<string, unknown> : null,
  };
}

export function LeadForm({ lead }: { lead?: Lead }) {
  const router = useRouter();
  const profile = useCurrentUser();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const mutation = lead ? updateLead : createLead;
  const canAssign = profile.data?.role !== "STAFF";
  const staffEdit = Boolean(lead && profile.data?.role === "STAFF");
  const currentMembership = profile.data?.membership;
  const assigneeOptions = [
    { value: "__unassigned", label: "Unassigned" },
    ...(lead?.assignedStaff ? [{ value: lead.assignedStaff.id, label: `${lead.assignedStaff.user.firstName} ${lead.assignedStaff.user.lastName}`, description: lead.assignedStaff.user.email }] : []),
    ...(currentMembership && ["MANAGER", "STAFF"].includes(currentMembership.role) && currentMembership.id !== lead?.assignedStaff?.id
      ? [{ value: currentMembership.id, label: "Assign to me", description: profile.data?.user.email }]
      : []),
  ];
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      fullName: lead?.fullName ?? "",
      phone: lead?.phone ?? "",
      email: lead?.email ?? "",
      source: lead?.source ?? "MANUAL",
      status: lead?.status ?? "NEW",
      assignedStaffId: lead?.assignedStaffId ?? "",
      notes: lead?.notes ?? "",
      tagsText: lead?.tags.join(", ") ?? "",
      customFieldsText: lead?.customFields ? JSON.stringify(lead.customFields, null, 2) : "",
    },
  });

  const submit = form.handleSubmit((values) => {
    const input = toInput({ ...values, assignedStaffId: values.assignedStaffId === "__unassigned" ? "" : values.assignedStaffId });
    const options = {
      onSuccess: (savedLead: Lead) => {
        toast.success(lead ? "Lead updated" : "Lead created");
        router.push(`/leads?lead=${savedLead.id}`);
      },
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.code === "DUPLICATE_LEAD") {
          form.setError("phone", { type: "server", message: "A lead with this phone number already exists in this business." });
        } else {
          applyApiFieldErrors(error, form.setError);
          toast.error("Could not save lead", { description: getApiErrorMessage(error) });
        }
      },
    };
    if (lead) updateLead.mutate({ id: lead.id, input: staffEdit ? { status: input.status, notes: input.notes } : input }, options);
    else createLead.mutate(input, options);
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {!staffEdit && <div className="grid gap-5 sm:grid-cols-2">
        <AppFormField id="fullName" label="Full name" error={form.formState.errors.fullName?.message} required><AppInput id="fullName" autoComplete="name" {...form.register("fullName")} /></AppFormField>
        <AppFormField id="phone" label="Phone number" error={form.formState.errors.phone?.message} required><AppInput id="phone" type="tel" autoComplete="tel" placeholder="+233 24 000 0000" {...form.register("phone")} /></AppFormField>
        <AppFormField id="email" label="Email address" error={form.formState.errors.email?.message}><AppInput id="email" type="email" autoComplete="email" {...form.register("email")} /></AppFormField>
        <Controller control={form.control} name="source" render={({ field }) => <AppFormField id="source" label="Source" error={form.formState.errors.source?.message} required><AppSelect id="source" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} options={LEAD_SOURCES.map((source) => ({ value: source, label: LEAD_SOURCE_LABELS[source] }))} /></AppFormField>} />
        {canAssign && <Controller control={form.control} name="assignedStaffId" render={({ field }) => <AppFormField id="assignedStaffId" label="Assigned staff" hint="Assignment uses the business membership ID."><AppSelect id="assignedStaffId" value={field.value || "__unassigned"} onValueChange={field.onChange} onBlur={field.onBlur} options={assigneeOptions} /></AppFormField>} />}
      </div>}
      <Controller control={form.control} name="status" render={({ field }) => <AppFormField id="status" label="Status" error={form.formState.errors.status?.message} required><AppSelect id="status" value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} options={LEAD_STATUSES.map((status) => ({ value: status, label: LEAD_STATUS_LABELS[status] }))} /></AppFormField>} />
      {!staffEdit && <AppFormField id="tagsText" label="Tags" hint="Separate tags with commas." error={form.formState.errors.tagsText?.message}><AppInput id="tagsText" placeholder="VIP, Accra, Follow-up" {...form.register("tagsText")} /></AppFormField>}
      <AppFormField id="notes" label="Notes" error={form.formState.errors.notes?.message}><textarea id="notes" rows={5} className="w-full resize-y rounded-lg border border-input bg-card px-3 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:text-sm" {...form.register("notes")} /></AppFormField>
      {!staffEdit && <AppFormField id="customFieldsText" label="Custom fields" hint='Optional JSON object, for example: { "budget": "GHS 5,000" }' error={form.formState.errors.customFieldsText?.message}><textarea id="customFieldsText" rows={4} spellCheck={false} className="w-full resize-y rounded-lg border border-input bg-card px-3 py-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20" {...form.register("customFieldsText")} /></AppFormField>}
      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
        <AppButton variant="ghost" asChild><Link href={lead ? `/leads?lead=${lead.id}` : "/leads"}><ArrowLeft className="size-4" />Cancel</Link></AppButton>
        <AppButton type="submit" loading={mutation.isPending} loadingText="Saving lead"><Save className="size-4" />{lead ? "Save changes" : "Create lead"}</AppButton>
      </div>
    </form>
  );
}
