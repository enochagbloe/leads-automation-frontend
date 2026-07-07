export type CustomerIssueType = "COMPLAINT" | "ISSUE" | "REQUEST_REQUIRES_INTERNAL_ACTION";

export type CustomerIssueCategory =
  | "DELAY"
  | "POOR_SERVICE"
  | "QUALITY_ISSUE"
  | "STAFF_BEHAVIOR"
  | "MISCOMMUNICATION"
  | "PAYMENT_ISSUE"
  | "APPOINTMENT_ISSUE"
  | "DELIVERY_OR_SITE_ISSUE"
  | "MISSING_ITEM_OR_MISSING_WORK"
  | "FOLLOW_UP_REQUIRED"
  | "OTHER";

export type CustomerIssueSeverity = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type CustomerIssueStatus = "OPEN" | "ACKNOWLEDGED" | "REOPENED" | "RESOLVED" | "CLOSED";
export type CustomerIssueReopenSource = "MANAGER_ACTION" | "CUSTOMER_MESSAGE" | "AI_MATCH" | string;

export interface CustomerIssueMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
  positionTitle?: string | null;
}

export interface CustomerIssueLead {
  id: string;
  name?: string | null;
  phone?: string | null;
}

export interface CustomerIssueConversation {
  id: string;
  displayId?: string | null;
  title?: string | null;
  lastMessagePreview?: string | null;
}

export interface CustomerIssueTimelineEvent {
  id?: string;
  type?: string;
  title?: string;
  description?: string | null;
  message?: string | null;
  actorType?: string | null;
  actorName?: string | null;
  previousStatus?: CustomerIssueStatus | null;
  newStatus?: CustomerIssueStatus | null;
  reopenSource?: CustomerIssueReopenSource | null;
  previousCategory?: CustomerIssueCategory | null;
  previousSeverity?: CustomerIssueSeverity | null;
  createdAt?: string | null;
  timestamp?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CustomerIssueMessage {
  id: string;
  direction?: "INBOUND" | "OUTBOUND" | string;
  body?: string | null;
  text?: string | null;
  content?: string | null;
  deliveryStatus?: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | string | null;
  createdAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CustomerIssue {
  id: string;
  businessId: string;
  leadId?: string | null;
  conversationId?: string | null;
  customerMessageId?: string | null;
  type: CustomerIssueType;
  category: CustomerIssueCategory;
  subcategory?: string | null;
  severity: CustomerIssueSeverity;
  summary: string;
  customerMessageExcerpt?: string | null;
  clientOwnerMembershipId?: string | null;
  conversationAssignedMembershipId?: string | null;
  suggestedResponsibleMembershipId?: string | null;
  responsibleMembershipId?: string | null;
  responsibleMember?: CustomerIssueMember | null;
  clientOwner?: CustomerIssueMember | null;
  lead?: CustomerIssueLead | null;
  conversation?: CustomerIssueConversation | null;
  routingReason?: string | null;
  status: CustomerIssueStatus;
  reopenCount?: number;
  createdBy: "AI" | "MANUAL";
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  timelineEvents?: CustomerIssueTimelineEvent[];
  issueMessages?: CustomerIssueMessage[];
}

export interface CustomerIssueListQuery {
  page?: number;
  limit?: number;
  status?: CustomerIssueStatus;
  severity?: CustomerIssueSeverity;
  category?: CustomerIssueCategory;
  search?: string;
  responsibleMembershipId?: string;
  tab?: "all" | "assigned-to-me" | "unassigned" | "open" | "resolved";
  dateFrom?: string;
  dateTo?: string;
}

export interface CustomerIssueListResponse {
  data: CustomerIssue[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export interface UpdateCustomerIssueStatusInput {
  status: CustomerIssueStatus;
}
