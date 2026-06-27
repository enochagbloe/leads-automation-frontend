"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import gsap from "gsap";
import { AlertTriangle, BellRing, CalendarCheck2, Check, ChevronDown, Eye, LoaderCircle, MessageSquareText, MoreHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { systemNotify } from "@/lib/system-notifications";
import { AppButton } from "@/components/app-button";
import { AppointmentActionDialog } from "@/components/calendar/appointment-action-dialogs";
import { AppointmentDetailDialog } from "@/components/calendar/appointment-detail-dialog";
import {
  useAppointment,
  useCancelAppointment,
  useCheckAppointmentAvailability,
  useCompleteAppointment,
  useConfirmAppointment,
  useMissedAppointment,
  useNoShowAppointment,
  useRescheduleAppointment,
} from "@/hooks/use-calendar-appointments";
import { useDismissNotification, useMarkNotificationActioned, useMarkNotificationRead, useNotifications } from "@/hooks/use-notifications";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { AppointmentAction } from "@/types/appointment";
import {
  ACTIONABLE_NOTIFICATION_CREATED_EVENT,
  type ActionableNotification,
  type NotificationAction,
  type NotificationActionType,
  type NotificationPriority,
} from "@/types/notification";

type DialogAction = Extract<AppointmentAction, "RESCHEDULE" | "CANCEL">;

const actionToDialog: Partial<Record<NotificationActionType, DialogAction>> = {
  RESCHEDULE_APPOINTMENT: "RESCHEDULE",
  CANCEL_APPOINTMENT: "CANCEL",
};

const priorityCopy: Record<NotificationPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High priority",
  URGENT: "Urgent",
};

function appointmentActionError(error: unknown) {
  if (!(error instanceof ApiError)) return getApiErrorMessage(error);
  const messages: Record<string, string> = {
    NOTIFICATION_NOT_FOUND: "This notification is no longer available.",
    NOTIFICATION_ACCESS_DENIED: "You do not have access to this notification.",
    NOTIFICATION_ALREADY_ACTIONED: "This notification was already handled.",
    NOTIFICATION_ALREADY_DISMISSED: "This notification was already dismissed.",
    APPOINTMENT_NOT_FOUND: "This appointment could not be found.",
    APPOINTMENT_ACCESS_DENIED: "You do not have access to this appointment.",
    APPOINTMENT_CANNOT_CONFIRM: "This appointment cannot be confirmed.",
    APPOINTMENT_REASON_REQUIRED: error.message,
    APPOINTMENT_CANNOT_COMPLETE: "This appointment cannot be completed.",
    APPOINTMENT_CANNOT_NO_SHOW: "This appointment cannot be marked as no-show.",
    APPOINTMENT_CANNOT_MARK_MISSED: "This appointment cannot be marked as missed.",
    FORBIDDEN: "You do not have permission to perform this action.",
    VALIDATION_ERROR: error.message,
  };
  return messages[error.code] ?? error.message;
}

function eventDetail(event: Event) {
  return event instanceof CustomEvent ? event.detail as ActionableNotification | undefined : undefined;
}

function isPersistentNotification(notification: ActionableNotification) {
  return notification.priority === "HIGH" || notification.priority === "URGENT";
}

export function ActionableNotificationHost({ activeBusinessId }: { activeBusinessId?: string | null }) {
  const router = useRouter();
  const [stack, setStack] = useState<ActionableNotification[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [dialogNotification, setDialogNotification] = useState<ActionableNotification | null>(null);
  const [dialogAction, setDialogAction] = useState<DialogAction | null>(null);
  const [detailAppointmentId, setDetailAppointmentId] = useState<string | null>(null);
  const notifications = useNotifications(activeBusinessId, { status: "UNREAD", limit: 5 });
  const markRead = useMarkNotificationRead(activeBusinessId);
  const dismiss = useDismissNotification(activeBusinessId);
  const actioned = useMarkNotificationActioned(activeBusinessId);
  const appointmentId = dialogNotification?.entityType === "APPOINTMENT" ? dialogNotification.entityId : undefined;
  const actionAppointment = useAppointment(activeBusinessId, appointmentId);
  const detailAppointment = useAppointment(activeBusinessId, detailAppointmentId);
  const confirmAppointment = useConfirmAppointment(activeBusinessId, "");
  const rescheduleAppointment = useRescheduleAppointment(activeBusinessId, appointmentId ?? "");
  const cancelAppointment = useCancelAppointment(activeBusinessId, appointmentId ?? "");
  const completeAppointment = useCompleteAppointment(activeBusinessId, "");
  const noShowAppointment = useNoShowAppointment(activeBusinessId, "");
  const missedAppointment = useMissedAppointment(activeBusinessId, "");
  const availabilityCheck = useCheckAppointmentAvailability();
  const dialogLoading = actionAppointment.isPending || rescheduleAppointment.isPending || cancelAppointment.isPending || availabilityCheck.isPending;

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const notification = eventDetail(event);
      if (!notification || (notification.businessId !== "local" && notification.businessId !== activeBusinessId) || notification.status === "DISMISSED") return;
      setStack((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 5));
    };
    window.addEventListener(ACTIONABLE_NOTIFICATION_CREATED_EVENT, handleNotification);
    return () => window.removeEventListener(ACTIONABLE_NOTIFICATION_CREATED_EVENT, handleNotification);
  }, [activeBusinessId]);

  const visibleStack = useMemo(() => {
    if (stack.length) return stack;
    if (!env.useMockApi) return [];
    return (notifications.data?.data ?? []).filter((notification) => !hiddenIds.has(notification.id)).slice(0, 3);
  }, [hiddenIds, notifications.data?.data, stack]);

  const removeFromStack = useCallback((notificationId: string) => {
    setExitingIds((current) => {
      if (current.has(notificationId)) return current;
      return new Set(current).add(notificationId);
    });
    window.setTimeout(() => {
      setHiddenIds((current) => new Set(current).add(notificationId));
      setStack((current) => current.filter((notification) => notification.id !== notificationId));
      setExitingIds((current) => {
        const next = new Set(current);
        next.delete(notificationId);
        return next;
      });
    }, 220);
  }, []);

  useEffect(() => {
    if (exitingIds.size > 0) return;
    const nextToDismiss = [...visibleStack].reverse().find((notification) => !isPersistentNotification(notification));
    if (!nextToDismiss) return;

    const timer = window.setTimeout(() => removeFromStack(nextToDismiss.id), 6_000);
    return () => window.clearTimeout(timer);
  }, [exitingIds, removeFromStack, visibleStack]);

  const readNotification = (notification: ActionableNotification) => {
    if (notification.status !== "UNREAD" || readIds.has(notification.id)) return;
    setReadIds((current) => new Set(current).add(notification.id));
    if (notification.id.startsWith("local-")) return;
    markRead.mutate(notification.id);
  };

  const dismissNotification = (notification: ActionableNotification) => {
    if (notification.id.startsWith("local-")) {
      removeFromStack(notification.id);
      return;
    }
    dismiss.mutate(notification.id, {
      onSuccess: () => removeFromStack(notification.id),
      onError: (error) => systemNotify.error("Could not dismiss notification", { description: appointmentActionError(error) }),
    });
  };

  const markActioned = (notification: ActionableNotification) => {
    if (notification.id.startsWith("local-")) {
      removeFromStack(notification.id);
      return;
    }
    actioned.mutate(notification.id, {
      onSuccess: () => removeFromStack(notification.id),
      onError: (error) => systemNotify.error("Action completed, but notification was not updated", { description: appointmentActionError(error) }),
    });
  };

  const viewAppointment = (notification: ActionableNotification) => {
    readNotification(notification);
    if (!notification.entityId) return;
    setDetailAppointmentId(notification.entityId);
  };

  const performDirectAction = (notification: ActionableNotification, action: NotificationAction) => {
    readNotification(notification);
    if (action.action === "DISMISS") {
      dismissNotification(notification);
      return;
    }
    if (action.action === "VIEW_APPOINTMENT") {
      viewAppointment(notification);
      return;
    }
    if (action.action === "VIEW_CONVERSATION" || action.action === "TAKE_OVER_CONVERSATION") {
      if (notification.entityId) router.push(`/conversations?conversationId=${notification.entityId}`);
      removeFromStack(notification.id);
      return;
    }
    if (action.action === "OPEN_URL") {
      if (action.href) router.push(action.href);
      removeFromStack(notification.id);
      return;
    }
    const mappedDialog = actionToDialog[action.action];
    if (mappedDialog) {
      setDialogNotification(notification);
      setDialogAction(mappedDialog);
      return;
    }
    if (!notification.entityId) return;

    const mutationOptions = {
      onSuccess: () => {
        systemNotify.success(action.label);
        markActioned(notification);
      },
      onError: (error: unknown) => systemNotify.error("Could not complete this action", { description: appointmentActionError(error) }),
    };

    if (action.action === "CONFIRM_APPOINTMENT") confirmAppointment.mutate({ appointmentId: notification.entityId, input: { note: null } }, mutationOptions);
    if (action.action === "MARK_COMPLETED") completeAppointment.mutate({ appointmentId: notification.entityId, input: { completedNote: null } }, mutationOptions);
    if (action.action === "MARK_NO_SHOW") noShowAppointment.mutate({ appointmentId: notification.entityId, input: { noShowReason: null } }, mutationOptions);
    if (action.action === "MARK_MISSED") missedAppointment.mutate({ appointmentId: notification.entityId, input: { missedReason: null } }, mutationOptions);
  };

  const closeDialog = () => {
    setDialogAction(null);
    setDialogNotification(null);
  };

  return (
    <>
      <NotificationStack>
        {visibleStack.map((notification) => (
          <ActionableNotificationCard
            key={notification.id}
            notification={notification}
            exiting={exitingIds.has(notification.id)}
            busy={dismiss.isPending || actioned.isPending || confirmAppointment.isPending || completeAppointment.isPending || noShowAppointment.isPending || missedAppointment.isPending}
            onDismiss={dismissNotification}
            onOptionsOpen={readNotification}
            onAction={performDirectAction}
          />
        ))}
      </NotificationStack>
      <AppointmentActionDialog
        action={dialogAction}
        appointment={actionAppointment.data?.appointment ?? null}
        loading={dialogLoading}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onConfirm={() => undefined}
        onComplete={() => undefined}
        onNoShow={() => undefined}
        onMissed={() => undefined}
        onReschedule={async (values) => {
          if (!dialogNotification || !actionAppointment.data?.appointment) return;
          const appointment = actionAppointment.data.appointment;
          try {
            const availability = await availabilityCheck.mutateAsync({
              date: values.newDate,
              time: values.newStartTime,
              timezone: values.timezone,
              assignedStaffId: appointment.assignedStaffId,
              serviceId: appointment.serviceId ?? undefined,
              durationMinutes: appointment.service?.durationMinutes ?? undefined,
              excludeAppointmentId: appointment.id,
            });
            if (!availability.available) {
              systemNotify.error("Could not reschedule appointment", { description: availability.message ?? "This time slot is not available. Choose another time." });
              return;
            }
            rescheduleAppointment.mutate(values, {
              onSuccess: () => {
                systemNotify.success("Appointment rescheduled.");
                markActioned(dialogNotification);
                closeDialog();
              },
              onError: (error) => systemNotify.error("Could not reschedule appointment", { description: appointmentActionError(error) }),
            });
          } catch (error) {
            systemNotify.error("Could not reschedule appointment", { description: appointmentActionError(error) });
          }
        }}
        onCancelAppointment={(values) => {
          if (!dialogNotification) return;
          cancelAppointment.mutate(values, {
            onSuccess: () => {
              systemNotify.success("Appointment cancelled.");
              markActioned(dialogNotification);
              closeDialog();
            },
            onError: (error) => systemNotify.error("Could not cancel appointment", { description: appointmentActionError(error) }),
          });
        }}
      />
      <AppointmentDetailDialog
        appointment={detailAppointment.data?.appointment ?? null}
        canAssignStaff={false}
        onAssign={() => undefined}
        onOpenChange={(open) => {
          if (!open) setDetailAppointmentId(null);
        }}
      />
    </>
  );
}

export function NotificationStack({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none fixed right-4 top-[4.75rem] z-[75] flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-2 sm:right-5"
      aria-live="polite"
      aria-relevant="additions"
    >
      {children}
    </div>
  );
}

export function ActionableNotificationCard({
  notification,
  exiting,
  busy,
  onDismiss,
  onOptionsOpen,
  onAction,
}: {
  notification: ActionableNotification;
  exiting?: boolean;
  busy?: boolean;
  onDismiss: (notification: ActionableNotification) => void;
  onOptionsOpen: (notification: ActionableNotification) => void;
  onAction: (notification: ActionableNotification, action: NotificationAction) => void;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const actions = notification.actions;
  const hasActions = actions.length > 0;

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.killTweensOf(card);
    if (reduceMotion) {
      gsap.set(card, { autoAlpha: exiting ? 0 : 1, x: 0, xPercent: 0, scale: 1, filter: "blur(0px)" });
      return;
    }

    if (exiting) {
      gsap.to(card, {
        xPercent: 100,
        x: 32,
        autoAlpha: 0,
        scale: 0.985,
        filter: "blur(2px)",
        duration: 0.18,
        ease: "power2.in",
        overwrite: true,
      });
      return;
    }

    gsap.fromTo(
      card,
      { xPercent: 100, x: 32, autoAlpha: 0, scale: 0.985, filter: "blur(2px)" },
      { xPercent: 0, x: 0, autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 0.3, ease: "power3.out", overwrite: true },
    );
  }, [exiting, notification.id]);

  return (
    <article
      ref={cardRef}
      className={cn(
        "pointer-events-auto relative overflow-visible rounded-[1.45rem] border border-white/45 bg-card/80 shadow-[0_16px_48px_rgba(20,35,27,0.15)] backdrop-blur-2xl duration-200",
        notification.priority === "HIGH" && "border-warning/45",
        notification.priority === "URGENT" && "border-destructive/45 shadow-[0_18px_65px_rgba(127,29,29,0.18)]",
      )}
    >
      <button
        type="button"
        aria-label="Dismiss notification"
        disabled={busy}
        onClick={() => onDismiss(notification)}
        className="absolute -left-2.5 -top-2.5 z-10 grid size-7 shrink-0 place-items-center rounded-full border border-white/55 bg-card/85 text-muted-foreground shadow-[0_8px_24px_rgba(20,35,27,0.14)] backdrop-blur-xl outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
      </button>
      <div className="p-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary shadow-sm", notification.priority === "URGENT" && "bg-destructive/10 text-destructive", notification.priority === "HIGH" && "bg-warning/10 text-warning")}>
            {notification.type.includes("APPOINTMENT") ? <CalendarCheck2 className="size-4" /> : notification.type.includes("CONVERSATION") ? <MessageSquareText className="size-4" /> : <BellRing className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">BizReply AI</span>
                  <NotificationPriorityBadge priority={notification.priority} />
                </div>
                <h2 className="mt-0.5 truncate text-[15px] font-bold leading-5 text-foreground">{notification.title}</h2>
                <p className="line-clamp-1 text-[13px] leading-5 text-foreground/80">{notification.message}</p>
              </div>
              {hasActions && (
                <div className="ml-auto hidden shrink-0 pt-5 sm:block">
                  <NotificationOptionsMenu
                    notification={notification}
                    actions={actions}
                    busy={busy}
                    onOpen={() => onOptionsOpen(notification)}
                    onAction={(action) => onAction(notification, action)}
                  />
                </div>
              )}
            </div>
            {hasActions && (
              <div className="mt-2 sm:hidden">
                <NotificationOptionsMenu
                  notification={notification}
                  actions={actions}
                  busy={busy}
                  onOpen={() => onOptionsOpen(notification)}
                  onAction={(action) => onAction(notification, action)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function NotificationOptionsMenu({
  notification,
  actions,
  busy,
  onOpen,
  onAction,
}: {
  notification: ActionableNotification;
  actions: NotificationAction[];
  busy?: boolean;
  onOpen: () => void;
  onAction: (action: NotificationAction) => void;
}) {
  return (
    <DropdownMenu.Root onOpenChange={(open) => { if (open) onOpen(); }}>
      <DropdownMenu.Trigger asChild>
        <AppButton size="sm" variant="secondary" className="h-8 min-h-8 rounded-full bg-muted/70 px-3 text-xs text-foreground hover:bg-muted" disabled={busy} aria-label={`Open options for ${notification.title}`}>
          Options <ChevronDown className="size-3.5" />
        </AppButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} collisionPadding={12} className="z-[95] min-w-60 rounded-2xl border border-white/50 bg-popover/95 p-2 shadow-[0_18px_55px_rgba(20,35,27,0.18)] backdrop-blur-xl outline-none">
          {actions.map((action) => (
            <DropdownMenu.Item
              key={action.action}
              onSelect={() => onAction(action)}
              className={cn(
                "flex min-h-9 cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 text-sm font-semibold outline-none transition-colors data-[highlighted]:bg-muted",
                action.variant === "destructive" && "text-destructive data-[highlighted]:bg-destructive/10",
              )}
            >
              {action.action === "CONFIRM_APPOINTMENT" && <Check className="size-4" />}
              {action.action === "VIEW_APPOINTMENT" && <Eye className="size-4" />}
              {action.action === "DISMISS" && <X className="size-4" />}
              {!["CONFIRM_APPOINTMENT", "VIEW_APPOINTMENT", "DISMISS"].includes(action.action) && <MoreHorizontal className="size-4" />}
              {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function NotificationPriorityBadge({ priority }: { priority: NotificationPriority }) {
  if (priority === "LOW" || priority === "NORMAL") return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em]", priority === "HIGH" && "bg-warning/10 text-warning", priority === "URGENT" && "bg-destructive/10 text-destructive")}>
      <AlertTriangle className="size-3" />
      {priorityCopy[priority]}
    </span>
  );
}
