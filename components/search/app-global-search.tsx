"use client";

import { ContactRound, CreditCard, LayoutDashboard, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ComponentType } from "react";
import { GlobalSearch } from "@/components/search/global-search";
import type { SearchFilterDefinition } from "@/components/search/search-utils";
import { useCurrentUser } from "@/hooks/use-auth";
import { useLeads } from "@/hooks/use-leads";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/lib/leads";
import { cn } from "@/lib/utils";

type SearchItem = {
  id: string;
  kind: "lead" | "page";
  group: "Leads" | "Pages";
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  searchText: string[];
  status: string[];
  source: string[];
  tags: string[];
  assigned: string[];
  type: string[];
  icon: ComponentType<{ className?: string }>;
};

const filters: SearchFilterDefinition<SearchItem>[] = [
  { key: "status", label: "Status", getValue: (item) => item.status },
  { key: "source", label: "Source", getValue: (item) => item.source },
  { key: "tag", label: "Tag", aliases: ["tags"], getValue: (item) => item.tags },
  { key: "assigned", label: "Assigned staff", aliases: ["staff", "owner"], getValue: (item) => item.assigned },
  { key: "type", label: "Result type", aliases: ["page", "kind"], getValue: (item) => item.type },
];

export function AppGlobalSearch() {
  const router = useRouter();
  const [activated, setActivated] = useState(false);
  const profile = useCurrentUser();
  const leads = useLeads({ page: 1, limit: 100, sortBy: "updatedAt", sortOrder: "desc" }, activated);

  const items = useMemo<SearchItem[]>(() => {
    const pageItems: SearchItem[] = [
      { id: "dashboard", kind: "page", group: "Pages", title: "Dashboard", subtitle: "Business workspace overview", meta: "Page", href: "/dashboard", searchText: ["overview", "workspace", "home"], status: [], source: [], tags: [], assigned: [], type: ["page"], icon: LayoutDashboard },
      { id: "leads", kind: "page", group: "Pages", title: "Leads", subtitle: "Manage customer opportunities", meta: "CRM page", href: "/leads", searchText: ["crm", "customers", "contacts"], status: [], source: [], tags: [], assigned: [], type: ["page", "leads"], icon: ContactRound },
      { id: "new-lead", kind: "page", group: "Pages", title: "Create lead", subtitle: "Add a new customer opportunity", meta: "CRM action", href: "/leads/new", searchText: ["new", "add", "customer"], status: [], source: [], tags: [], assigned: [], type: ["page", "action"], icon: UserRound },
      { id: "billing", kind: "page", group: "Pages", title: "Billing & plan", subtitle: "Subscription usage and plan details", meta: "Settings page", href: "/settings/billing", searchText: ["subscription", "plan", "usage"], status: [], source: [], tags: [], assigned: [], type: ["page", "settings"], icon: CreditCard },
      ...(profile.data?.permissions.includes("members:manage") ? [{ id: "members", kind: "page" as const, group: "Pages" as const, title: "Team members", subtitle: "Invite and manage workspace members", meta: "Settings page", href: "/settings/members", searchText: ["staff", "invite", "manager"], status: [], source: [], tags: [], assigned: [], type: ["page", "settings"], icon: Users }] : []),
    ];

    const leadItems = (leads.data?.data ?? []).map<SearchItem>((lead) => ({
      id: lead.id,
      kind: "lead",
      group: "Leads",
      title: lead.fullName,
      subtitle: [lead.phone, lead.email].filter(Boolean).join(" · "),
      meta: `${LEAD_STATUS_LABELS[lead.status]} · ${LEAD_SOURCE_LABELS[lead.source]}`,
      href: `/leads?lead=${lead.id}`,
      searchText: [lead.fullName, lead.phone, lead.email ?? "", lead.notes ?? "", ...lead.tags],
      status: [lead.status, LEAD_STATUS_LABELS[lead.status]],
      source: [lead.source, LEAD_SOURCE_LABELS[lead.source]],
      tags: lead.tags,
      assigned: lead.assignedStaff ? [lead.assignedStaff.id, lead.assignedStaff.user.firstName, lead.assignedStaff.user.lastName, lead.assignedStaff.user.email] : ["unassigned"],
      type: ["lead", "crm"],
      icon: ContactRound,
    }));
    return [...pageItems, ...leadItems];
  }, [leads.data?.data, profile.data?.permissions]);

  return (
    <GlobalSearch
      items={items}
      availableFilters={filters}
      getItemKey={(item) => `${item.kind}-${item.id}`}
      getItemLabel={(item) => item.title}
      getItemGroup={(item) => item.group}
      getSearchableText={(item) => item.searchText}
      loading={activated && leads.isPending}
      errorMessage={leads.error?.message}
      onVisibilityChange={(open) => { if (open) setActivated(true); }}
      onSelect={(item) => router.push(item.href)}
      resultRenderer={({ item, active }) => {
        const Icon = item.icon;
        return <div className="flex items-start gap-3"><span className={cn("grid size-10 shrink-0 place-items-center rounded-xl border", active ? "border-primary/20 bg-card text-primary" : "bg-muted text-muted-foreground")}><Icon className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{item.title}</p><span className="rounded-full border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{item.group}</span></div><p className="mt-1 truncate text-sm text-muted-foreground">{item.subtitle}</p><p className="mt-1.5 truncate text-xs font-medium text-muted-foreground">{item.meta}</p></div></div>;
      }}
    />
  );
}
