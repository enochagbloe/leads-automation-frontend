"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { notificationService } from "@/services/notification-service";
import type { NotificationListQuery } from "@/types/notification";

function invalidateNotifications(client: ReturnType<typeof useQueryClient>, businessId?: string | null) {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    ...(businessId ? [
      client.invalidateQueries({ queryKey: queryKeys.notifications.business(businessId) }),
      client.invalidateQueries({ queryKey: queryKeys.notifications.counts(businessId) }),
    ] : []),
  ]);
}

export function useNotifications(businessId: string | null | undefined, query: NotificationListQuery = {}) {
  return useQuery({
    queryKey: queryKeys.notifications.list(businessId ?? "", query),
    queryFn: () => notificationService.list(query),
    enabled: Boolean(businessId),
  });
}

export function useNotificationCounts(businessId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.notifications.counts(businessId ?? ""),
    queryFn: notificationService.counts,
    enabled: Boolean(businessId),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead(businessId: string | null | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.read(notificationId),
    onSuccess: () => invalidateNotifications(client, businessId),
  });
}

export function useDismissNotification(businessId: string | null | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.dismiss(notificationId),
    onSuccess: () => invalidateNotifications(client, businessId),
  });
}

export function useMarkNotificationActioned(businessId: string | null | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationService.actioned(notificationId),
    onSuccess: () => invalidateNotifications(client, businessId),
  });
}
