import type { ActionableNotification, NotificationCounts, NotificationListQuery, NotificationListResponse, NotificationStatus } from "@/types/notification";

const now = new Date();

let notifications: ActionableNotification[] = [
  {
    id: "mock-notification-1",
    businessId: "mock-business",
    recipientMembershipId: "mock-membership",
    type: "APPOINTMENT_NEEDS_CONFIRMATION",
    priority: "HIGH",
    title: "Appointment needs confirmation",
    message: "Kwame requested Property Viewing today at 5:00 PM.",
    entityType: "APPOINTMENT",
    entityId: "appt-2",
    actions: [
      { label: "Confirm", action: "CONFIRM_APPOINTMENT" },
      { label: "Reschedule", action: "RESCHEDULE_APPOINTMENT", variant: "secondary" },
      { label: "Cancel", action: "CANCEL_APPOINTMENT", variant: "destructive" },
      { label: "View appointment", action: "VIEW_APPOINTMENT", variant: "secondary" },
    ],
    status: "UNREAD",
    createdAt: now.toISOString(),
  },
  {
    id: "mock-notification-2",
    businessId: "mock-business",
    recipientMembershipId: "mock-membership",
    type: "APPOINTMENT_OUTCOME_REQUIRED",
    priority: "NORMAL",
    title: "Appointment outcome needed",
    message: "A completed appointment is waiting for its final outcome.",
    entityType: "APPOINTMENT",
    entityId: "appt-1",
    actions: [
      { label: "View appointment", action: "VIEW_APPOINTMENT", variant: "secondary" },
      { label: "Dismiss", action: "DISMISS", variant: "secondary" },
    ],
    status: "UNREAD",
    createdAt: new Date(now.getTime() - 1000 * 60 * 18).toISOString(),
  },
];

function counts(): NotificationCounts {
  const active = notifications.filter((notification) => notification.status !== "DISMISSED");
  return {
    unread: active.filter((notification) => notification.status === "UNREAD").length,
    highPriority: active.filter((notification) => notification.priority === "HIGH").length,
    urgent: active.filter((notification) => notification.priority === "URGENT").length,
  };
}

function updateStatus(notificationId: string, status: NotificationStatus) {
  const timestamp = new Date().toISOString();
  notifications = notifications.map((notification) => {
    if (notification.id !== notificationId) return notification;
    return {
      ...notification,
      status,
      readAt: status === "READ" ? timestamp : notification.readAt,
      actionedAt: status === "ACTIONED" ? timestamp : notification.actionedAt,
      dismissedAt: status === "DISMISSED" ? timestamp : notification.dismissedAt,
    };
  });
}

export const mockNotificationService = {
  list: async (query: NotificationListQuery = {}): Promise<NotificationListResponse> => {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filtered = notifications
      .filter((notification) => query.status ? notification.status === query.status : notification.status !== "DISMISSED")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const offset = (page - 1) * limit;
    return {
      data: filtered.slice(offset, offset + limit),
      counts: counts(),
      pagination: { page, limit, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / limit)) },
    };
  },
  counts: async () => counts(),
  read: async (notificationId: string) => {
    updateStatus(notificationId, "READ");
  },
  dismiss: async (notificationId: string) => {
    updateStatus(notificationId, "DISMISSED");
  },
  actioned: async (notificationId: string) => {
    updateStatus(notificationId, "ACTIONED");
  },
};
