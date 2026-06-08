"use client";

import { AppErrorState } from "@/components/app-error-state";
import { LeadForm } from "@/components/leads/lead-form";
import { LoadingPage } from "@/components/states/loading-states";
import { useLead } from "@/hooks/use-leads";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";

export function EditLeadPage({ id }: { id: string }) {
  const detail = useLead(id);
  if (detail.isPending) return <LoadingPage />;
  if (detail.isError) return <main className="p-4 sm:p-8"><AppErrorState title={detail.error instanceof ApiError && detail.error.code === "LEAD_NOT_FOUND" ? "Lead not found" : "Could not load lead"} description={getApiErrorMessage(detail.error)} onRetry={() => detail.refetch()} /></main>;
  return <main className="mx-auto w-full max-w-4xl space-y-7 p-4 sm:p-6 lg:p-8"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">CRM workspace</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Edit {detail.data.lead.fullName}</h1><p className="mt-2 text-sm text-muted-foreground">Update the lead details available to your role.</p></header><section className="rounded-xl border bg-card p-5 shadow-sm sm:p-7"><LeadForm lead={detail.data.lead} /></section></main>;
}
