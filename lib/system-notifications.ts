"use client";

import {
  ACTIONABLE_NOTIFICATION_CREATED_EVENT,
  type ActionableNotification,
  type NotificationAction,
  type NotificationPriority,
} from "@/types/notification";

type NotificationTone = "success" | "error" | "info" | "warning";

interface SystemNotifyOptions {
  description?: string;
  priority?: NotificationPriority;
  actions?: NotificationAction[];
  businessId?: string;
  entityType?: ActionableNotification["entityType"];
  entityId?: string;
}

const tonePriority: Record<NotificationTone, NotificationPriority> = {
  success: "NORMAL",
  error: "HIGH",
  info: "NORMAL",
  warning: "HIGH",
};

const toneTitle: Record<NotificationTone, ActionableNotification["type"]> = {
  success: "INFO",
  error: "INFO",
  info: "INFO",
  warning: "INFO",
};

function emit(title: string, tone: NotificationTone, options: SystemNotifyOptions = {}) {
  if (typeof window === "undefined") return;
  const notification: ActionableNotification = {
    id: `local-${tone}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    businessId: options.businessId ?? "local",
    recipientMembershipId: "",
    type: toneTitle[tone],
    priority: options.priority ?? tonePriority[tone],
    title,
    message: options.description ?? title,
    entityType: options.entityType,
    entityId: options.entityId,
    actions: options.actions ?? [],
    status: "UNREAD",
    createdAt: new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent(ACTIONABLE_NOTIFICATION_CREATED_EVENT, { detail: notification }));
}

export const systemNotify = {
  success: (title: string, options?: SystemNotifyOptions) => emit(title, "success", options),
  error: (title: string, options?: SystemNotifyOptions) => emit(title, "error", options),
  info: (title: string, options?: SystemNotifyOptions) => emit(title, "info", options),
  warning: (title: string, options?: SystemNotifyOptions) => emit(title, "warning", options),
};
