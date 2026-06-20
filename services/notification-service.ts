import { env } from "@/lib/env";
import { apiRequest } from "@/lib/api-client";
import { mockNotificationService } from "@/services/mock-notification-service";
import type {
  ActionableNotification,
  ActionableNotificationType,
  NotificationAction,
  NotificationCounts,
  NotificationEntityType,
  NotificationListQuery,
  NotificationListResponse,
  NotificationPriority,
  NotificationStatus,
} from "@/types/notification";

function queryString(query: NotificationListQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params.toString();
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function normalizeActions(value: unknown): NotificationAction[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<NotificationAction[]>((actions, action) => {
      if (!action || typeof action !== "object") return actions;
      const entry = action as Partial<NotificationAction>;
      if (!entry.label || !entry.action) return actions;
      actions.push({
        label: entry.label,
        action: entry.action,
        variant: entry.variant,
      });
      return actions;
    }, []);
}

export function normalizeActionableNotification(value: unknown): ActionableNotification | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = stringValue(record.id);
  const businessId = stringValue(record.businessId);
  const title = stringValue(record.title);
  const message = stringValue(record.message);
  if (!id || !businessId || !title || !message) return null;

  return {
    id,
    businessId,
    recipientMembershipId: stringValue(record.recipientMembershipId) ?? "",
    type: (stringValue(record.type) ?? "INFO") as ActionableNotificationType,
    priority: (stringValue(record.priority) ?? "NORMAL") as NotificationPriority,
    title,
    message,
    entityType: stringValue(record.entityType) as NotificationEntityType | undefined,
    entityId: stringValue(record.entityId),
    actions: normalizeActions(record.actions),
    status: (stringValue(record.status) ?? "UNREAD") as NotificationStatus,
    createdAt: stringValue(record.createdAt) ?? new Date().toISOString(),
    readAt: stringValue(record.readAt),
    actionedAt: stringValue(record.actionedAt),
    dismissedAt: stringValue(record.dismissedAt),
    expiresAt: stringValue(record.expiresAt),
  };
}

function normalizeListResponse(response: NotificationListResponse): NotificationListResponse {
  return {
    ...response,
    data: response.data.map(normalizeActionableNotification).filter((notification): notification is ActionableNotification => Boolean(notification)),
  };
}

export const notificationService = {
  list: (query: NotificationListQuery = {}) => {
    if (env.useMockApi) return mockNotificationService.list(query);
    const queryPart = queryString(query);
    return apiRequest<NotificationListResponse>(`/business/notifications${queryPart ? `?${queryPart}` : ""}`).then(normalizeListResponse);
  },
  counts: () => env.useMockApi
    ? mockNotificationService.counts()
    : apiRequest<NotificationCounts>("/business/notifications/counts"),
  read: (notificationId: string) => env.useMockApi
    ? mockNotificationService.read(notificationId)
    : apiRequest<void>(`/business/notifications/${notificationId}/read`, { method: "PATCH" }),
  dismiss: (notificationId: string) => env.useMockApi
    ? mockNotificationService.dismiss(notificationId)
    : apiRequest<void>(`/business/notifications/${notificationId}/dismiss`, { method: "PATCH" }),
  actioned: (notificationId: string) => env.useMockApi
    ? mockNotificationService.actioned(notificationId)
    : apiRequest<void>(`/business/notifications/${notificationId}/actioned`, { method: "PATCH" }),
};
