import type { ApiMessage } from "@/types/auth";
import type {
  BusinessPoliciesQuery,
  BusinessPoliciesResponse,
  BusinessPolicy,
  BusinessPolicyCategory,
  BusinessPolicyInput,
  PoliciesSummary,
  UpdateBusinessPolicyInput,
} from "@/types/business-policy";

const now = new Date().toISOString();
const recommended: BusinessPolicyCategory[] = ["PAYMENT", "CANCELLATION", "REFUND", "RESCHEDULING", "DEPOSIT", "SERVICE_AREA"];
let policies: BusinessPolicy[] = [
  {
    id: "policy_demo_payment",
    title: "Payment terms",
    category: "PAYMENT",
    content: "Customers must complete payment before a confirmed service appointment begins.",
    shortSummary: "Payment is required before a confirmed appointment.",
    visibility: "CUSTOMER_FACING",
    isActive: true,
    isArchived: false,
    displayOrder: 1,
    priority: 10,
    source: "MANUAL",
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  },
  {
    id: "policy_demo_internal",
    title: "Refund escalation",
    category: "REFUND",
    content: "Refund requests above GHS 500 must be reviewed by a business owner.",
    shortSummary: "Large refund requests require owner review.",
    visibility: "INTERNAL_ONLY",
    isActive: true,
    isArchived: false,
    displayOrder: 2,
    priority: 20,
    source: "MANUAL",
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  },
];

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
export const getMockPoliciesSummary = (): PoliciesSummary => {
  const current = policies.filter((policy) => !policy.isArchived);
  const configured = [...new Set(current.filter((policy) => policy.isActive && policy.visibility === "CUSTOMER_FACING").map((policy) => policy.category))];
  return {
    total: policies.length,
    active: current.filter((policy) => policy.isActive).length,
    inactive: current.filter((policy) => !policy.isActive).length,
    archived: policies.filter((policy) => policy.isArchived).length,
    customerFacing: current.filter((policy) => policy.isActive && policy.visibility === "CUSTOMER_FACING").length,
    internalOnly: current.filter((policy) => policy.isActive && policy.visibility === "INTERNAL_ONLY").length,
    categoriesConfigured: configured,
    missingRecommendedCategories: recommended.filter((category) => !configured.includes(category)),
  };
};
const makePolicy = (input: BusinessPolicyInput, existing?: BusinessPolicy): BusinessPolicy => ({
  id: existing?.id ?? `policy_demo_${Date.now()}`,
  title: input.title,
  category: input.category,
  content: input.content,
  shortSummary: input.shortSummary ?? null,
  visibility: input.visibility ?? "CUSTOMER_FACING",
  isActive: input.isActive ?? true,
  isArchived: existing?.isArchived ?? false,
  displayOrder: existing?.displayOrder ?? policies.length + 1,
  priority: input.priority ?? 0,
  source: existing?.source ?? "MANUAL",
  createdAt: existing?.createdAt ?? now,
  updatedAt: new Date().toISOString(),
  archivedAt: existing?.archivedAt ?? null,
});

export const mockBusinessPolicyService = {
  async list(query: BusinessPoliciesQuery): Promise<BusinessPoliciesResponse> {
    await delay();
    const filtered = policies.filter((policy) => {
      if (query.status === "active" && (!policy.isActive || policy.isArchived)) return false;
      if (query.status === "inactive" && (policy.isActive || policy.isArchived)) return false;
      if (query.status === "archived" && !policy.isArchived) return false;
      if (query.category && policy.category !== query.category) return false;
      if (query.visibility && policy.visibility !== query.visibility) return false;
      return !query.search || [policy.title, policy.shortSummary, policy.content].some((value) => value?.toLowerCase().includes(query.search!.toLowerCase()));
    });
    const sorted = [...filtered].sort((a, b) => {
      const left = a[query.sort];
      const right = b[query.sort];
      return String(left).localeCompare(String(right), undefined, { numeric: true }) * (query.sortOrder === "asc" ? 1 : -1);
    });
    const start = (query.page - 1) * query.limit;
    return { items: sorted.slice(start, start + query.limit), pagination: { page: query.page, limit: query.limit, total: sorted.length, totalPages: Math.ceil(sorted.length / query.limit) }, summary: getMockPoliciesSummary() };
  },
  async summary() { await delay(150); return getMockPoliciesSummary(); },
  async detail(id: string) { await delay(); return policies.find((policy) => policy.id === id)!; },
  async create(input: BusinessPolicyInput) { await delay(); const policy = makePolicy(input); policies = [...policies, policy]; return policy; },
  async update({ id, input }: { id: string; input: UpdateBusinessPolicyInput }) {
    await delay();
    const existing = policies.find((policy) => policy.id === id)!;
    const policy = makePolicy({ ...existing, ...input, title: input.title ?? existing.title, category: input.category ?? existing.category, content: input.content ?? existing.content }, existing);
    policies = policies.map((item) => item.id === id ? policy : item);
    return policy;
  },
  async archive(id: string) { await delay(); const existing = policies.find((policy) => policy.id === id)!; const policy = { ...existing, isActive: false, isArchived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; policies = policies.map((item) => item.id === id ? policy : item); return policy; },
  async restore(id: string) { await delay(); const existing = policies.find((policy) => policy.id === id)!; const policy = { ...existing, isActive: true, isArchived: false, archivedAt: null, updatedAt: new Date().toISOString() }; policies = policies.map((item) => item.id === id ? policy : item); return policy; },
  async reorder(items: Array<{ id: string; displayOrder: number }>): Promise<ApiMessage> { await delay(); policies = policies.map((policy) => ({ ...policy, displayOrder: items.find((item) => item.id === policy.id)?.displayOrder ?? policy.displayOrder })); return { message: "Policies reordered successfully" }; },
};
