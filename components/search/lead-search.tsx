"use client";

import { ContactRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GlobalSearch } from "@/components/search/global-search";
import type { SearchFilterDefinition } from "@/components/search/search-utils";
import { useLeads } from "@/hooks/use-leads";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/lib/leads";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/lead";

const filters: SearchFilterDefinition<Lead>[] = [
  { key: "status", label: "Status", getValue: (lead) => [lead.status, LEAD_STATUS_LABELS[lead.status]] },
  { key: "source", label: "Source", getValue: (lead) => [lead.source, LEAD_SOURCE_LABELS[lead.source]] },
  { key: "tag", label: "Tag", aliases: ["tags"], getValue: (lead) => lead.tags },
  { key: "assigned", label: "Assigned staff", aliases: ["staff"], getValue: (lead) => lead.assignedStaff ? [lead.assignedStaff.user.firstName, lead.assignedStaff.user.lastName, lead.assignedStaff.user.email] : ["unassigned"] },
];

export function LeadSearch({ onSelect }: { onSelect?: (lead: Lead) => void } = {}) {
  const router = useRouter();
  const [activated, setActivated] = useState(false);
  const leads = useLeads({ page: 1, limit: 100, sortBy: "updatedAt", sortOrder: "desc" }, activated);
  const items = useMemo(() => leads.data?.data ?? [], [leads.data?.data]);

  return (
    <GlobalSearch
      items={items}
      availableFilters={filters}
      getItemKey={(lead) => lead.id}
      getItemLabel={(lead) => lead.fullName}
      getItemGroup={() => "Leads"}
      getSearchableText={(lead) => [lead.fullName, lead.phone, lead.email ?? "", lead.notes ?? "", ...lead.tags]}
      triggerLabel="Search leads"
      triggerClassName="sm:w-[340px] lg:w-[420px]"
      shortcutHint="Lead only"
      enableShortcut={false}
      placeholder="Search leads by name, phone, email, or @filters"
      instructions="Lead search only. Use @status, @source, @tag, or @assigned."
      loading={activated && leads.isPending}
      errorMessage={leads.error?.message}
      onVisibilityChange={(open) => { if (open) setActivated(true); }}
      onSelect={(lead) => onSelect ? onSelect(lead) : router.push(`/leads?lead=${lead.id}`)}
      resultRenderer={({ item: lead, active }) => (
        <div className="flex items-start gap-3">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl border", active ? "border-primary/20 bg-card text-primary" : "bg-muted text-muted-foreground")}><ContactRound className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{lead.fullName}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{[lead.phone, lead.email].filter(Boolean).join(" · ")}</p>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">{LEAD_STATUS_LABELS[lead.status]} · {LEAD_SOURCE_LABELS[lead.source]}</p>
          </div>
        </div>
      )}
    />
  );
}
