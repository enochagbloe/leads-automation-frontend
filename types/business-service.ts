export type ServicePriceType = "FIXED" | "STARTING_FROM" | "RANGE" | "QUOTE_ONLY" | "FREE" | "NOT_SET";
export type ServiceReadinessStatus = "DRAFT" | "INCOMPLETE" | "READY_FOR_AI" | "READY_FOR_BOOKING" | "ARCHIVED";
export type ServiceSource = "MANUAL" | "IMPORTED" | "AI_SUGGESTED" | "AI_APPROVED";
export type ServiceListStatus = "active" | "inactive" | "archived" | "all";

export interface BusinessService {
  id: string;
  name: string;
  slug?: string;
  category: string | null;
  description: string | null;
  basePrice: string | null;
  currency: string;
  priceType: ServicePriceType;
  priceDescription: string | null;
  durationMinutes: number | null;
  bufferMinutes: number;
  requiresPayment: boolean;
  paymentRequiredBeforeBooking: boolean;
  isBookable: boolean;
  isActive: boolean;
  isArchived: boolean;
  autoConfirmEligible?: boolean;
  requiresManualApproval?: boolean;
  requiresDepositBeforeConfirmation?: boolean;
  requiresLocationBeforeConfirmation?: boolean;
  requiresStaffAssignment?: boolean;
  readinessStatus: ServiceReadinessStatus;
  missingFields: string[];
  displayOrder: number;
  source: ServiceSource;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ServicesSummary {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  draft: number;
  incomplete: number;
  readyForAi: number;
  readyForBooking: number;
  missingPrices: number;
  missingDurations: number;
  bookable: number;
}

export interface BusinessServicesQuery {
  status: ServiceListStatus;
  readinessStatus?: ServiceReadinessStatus;
  search?: string;
  category?: string;
  page: number;
  limit: number;
  sort: "displayOrder" | "name" | "createdAt" | "updatedAt";
  sortOrder: "asc" | "desc";
}

export interface BusinessServicesResponse {
  items: BusinessService[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: ServicesSummary;
}

export interface BusinessServiceInput {
  name: string;
  category?: string | null;
  description?: string | null;
  basePrice?: string | null;
  currency?: string;
  priceType?: ServicePriceType;
  priceDescription?: string | null;
  durationMinutes?: number | null;
  bufferMinutes?: number;
  requiresPayment?: boolean;
  paymentRequiredBeforeBooking?: boolean;
  isBookable?: boolean;
  isActive?: boolean;
  autoConfirmEligible?: boolean;
  requiresManualApproval?: boolean;
  requiresDepositBeforeConfirmation?: boolean;
  requiresLocationBeforeConfirmation?: boolean;
  requiresStaffAssignment?: boolean;
}

export type UpdateBusinessServiceInput = Partial<BusinessServiceInput>;
