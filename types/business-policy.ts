export const BUSINESS_POLICY_CATEGORIES = [
  "GENERAL",
  "PAYMENT",
  "DEPOSIT",
  "REFUND",
  "CANCELLATION",
  "RESCHEDULING",
  "LATE_ARRIVAL",
  "NO_SHOW",
  "TRANSPORTATION",
  "SERVICE_AREA",
  "APPOINTMENT",
  "PRIVACY",
  "TERMS",
  "OTHER",
] as const;

export type BusinessPolicyCategory = (typeof BUSINESS_POLICY_CATEGORIES)[number];
export type BusinessPolicyVisibility = "INTERNAL_ONLY" | "CUSTOMER_FACING";
export type BusinessPolicySource = "MANUAL" | "IMPORTED" | "AI_SUGGESTED" | "AI_APPROVED";
export type BusinessPolicyListStatus = "active" | "inactive" | "archived" | "all";

export interface BusinessPolicy {
  id: string;
  title: string;
  category: BusinessPolicyCategory;
  content: string;
  shortSummary: string | null;
  visibility: BusinessPolicyVisibility;
  isActive: boolean;
  isArchived: boolean;
  displayOrder: number;
  priority: number;
  source: BusinessPolicySource;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface PoliciesSummary {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  customerFacing: number;
  internalOnly: number;
  categoriesConfigured: BusinessPolicyCategory[];
  missingRecommendedCategories: BusinessPolicyCategory[];
}

export interface BusinessPoliciesQuery {
  category?: BusinessPolicyCategory;
  visibility?: BusinessPolicyVisibility;
  status: BusinessPolicyListStatus;
  search?: string;
  page: number;
  limit: number;
  sort: "displayOrder" | "priority" | "category" | "createdAt" | "updatedAt";
  sortOrder: "asc" | "desc";
}

export interface BusinessPoliciesResponse {
  items: BusinessPolicy[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: PoliciesSummary;
}

export interface BusinessPolicyInput {
  title: string;
  category: BusinessPolicyCategory;
  content: string;
  shortSummary?: string | null;
  visibility?: BusinessPolicyVisibility;
  isActive?: boolean;
  priority?: number;
}

export type UpdateBusinessPolicyInput = Partial<BusinessPolicyInput>;
