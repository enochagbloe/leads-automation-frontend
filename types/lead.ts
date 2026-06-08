export type LeadSource = "MANUAL" | "WHATSAPP" | "WEBSITE" | "REFERRAL" | "INSTAGRAM" | "FACEBOOK" | "OTHER";
export type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "APPOINTMENT_SCHEDULED" | "WON" | "LOST";
export type LeadActivityAction = "LEAD_CREATED" | "LEAD_UPDATED" | "LEAD_ASSIGNED" | "LEAD_STATUS_CHANGED" | "LEAD_NOTE_UPDATED" | "LEAD_DELETED";
export type LeadSortBy = "createdAt" | "updatedAt" | "fullName" | "status" | "lastContactedAt";
export type SortOrder = "asc" | "desc";

export interface LeadAssignee {
  id: string;
  role: "BUSINESS_OWNER" | "MANAGER" | "STAFF";
  status: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

export interface Lead {
  id: string;
  businessId: string;
  fullName: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  status: LeadStatus;
  assignedStaffId: string | null;
  assignedStaff: LeadAssignee | null;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string };
  notes: string | null;
  tags: string[];
  customFields: Record<string, unknown> | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  actorUserId: string;
  action: LeadActivityAction;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string } | null;
}

export interface LeadListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: LeadStatus;
  source?: LeadSource;
  assignedStaffId?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: LeadSortBy;
  sortOrder: SortOrder;
}

export interface LeadListResponse {
  data: Lead[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
}

export interface LeadDetailResponse {
  lead: Lead;
  activities: LeadActivity[];
}

export interface LeadInput {
  fullName: string;
  phone: string;
  email?: string | null;
  source?: LeadSource;
  status?: LeadStatus;
  assignedStaffId?: string | null;
  notes?: string | null;
  tags?: string[];
  customFields?: Record<string, unknown> | null;
}

export type UpdateLeadInput = Partial<LeadInput>;
