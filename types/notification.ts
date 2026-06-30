export const ACTIONABLE_NOTIFICATION_CREATED_EVENT = "bizreply:actionable-notification-created";

export type ActionableNotificationType =
  | "INFO"
  | "APPOINTMENT_NEEDS_CONFIRMATION"
  | "APPOINTMENT_OUTCOME_REQUIRED"
  | "APPOINTMENT_NEEDS_REVIEW"
  | "APPOINTMENT_ASSIGNED"
  | "APPOINTMENT_CONFIRMED"
  | "AI_HUMAN_REVIEW_REQUIRED"
  | "CONVERSATION_HANDOFF_REQUIRED";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type NotificationStatus = "UNREAD" | "READ" | "ACTIONED" | "DISMISSED";
export type NotificationEntityType = "APPOINTMENT" | "CONVERSATION" | "LEAD" | "BUSINESS" | "CUSTOMER_ISSUE";

export type NotificationActionType =
  | "CONFIRM_APPOINTMENT"
  | "RESCHEDULE_APPOINTMENT"
  | "CANCEL_APPOINTMENT"
  | "VIEW_APPOINTMENT"
  | "MARK_COMPLETED"
  | "MARK_NO_SHOW"
  | "MARK_MISSED"
  | "VIEW_CONVERSATION"
  | "VIEW_CUSTOMER_ISSUE"
  | "TAKE_OVER_CONVERSATION"
  | "OPEN_URL"
  | "DISMISS";

export interface NotificationAction {
  label: string;
  action: NotificationActionType;
  variant?: "default" | "secondary" | "destructive";
  href?: string;
}

export interface ActionableNotification {
  id: string;
  businessId: string;
  recipientMembershipId: string;
  type: ActionableNotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  actions: NotificationAction[];
  status: NotificationStatus;
  createdAt: string;
  readAt?: string;
  actionedAt?: string;
  dismissedAt?: string;
  expiresAt?: string;
}

export interface NotificationCounts {
  unread: number;
  highPriority: number;
  urgent: number;
}

export interface NotificationListQuery {
  status?: NotificationStatus;
  page?: number;
  limit?: number;
}

export interface NotificationListResponse {
  data: ActionableNotification[];
  counts?: NotificationCounts;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
