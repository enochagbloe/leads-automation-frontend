"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Inbox, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppButton } from "@/components/app-button";
import { useSidebar } from "@/components/sidebar/sidebar-provider";
import { useNotifications, useMarkNotificationRead, useDismissNotification } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import styles from "./sidebar-notification-inbox.module.css";

export function SidebarNotificationInbox({ businessId, unreadCount = 0, canManage = false }: {
  businessId: string; unreadCount?: number; canManage?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { desktopExpanded, setInteractionOpen } = useSidebar();
  useEffect(() => () => setInteractionOpen(false), [setInteractionOpen]);
  return <Dialog.Root modal={false} open={open} onOpenChange={value => { setOpen(value); setInteractionOpen(value); }}>
    <Dialog.Trigger asChild><AppButton size="icon" variant="ghost" className="relative size-9 min-h-9 shrink-0" aria-label={`Notification inbox${unreadCount ? `, ${unreadCount} unread` : ""}`} title="Notifications">
      <Inbox className="size-4" />
      {unreadCount > 0 && <span aria-hidden="true" className="absolute right-1 top-1 size-2 rounded-full bg-primary ring-2 ring-card" />}
    </AppButton></Dialog.Trigger>
    <Dialog.Portal><Dialog.Content className={cn(styles.panel, "fixed inset-y-0 left-0 z-[60] flex w-full flex-col border-r bg-card shadow-xl outline-none lg:z-[35]", desktopExpanded ? "lg:left-[280px] lg:w-[min(420px,calc(100vw-280px))]" : "lg:left-[72px] lg:w-[min(420px,calc(100vw-72px))]")}>
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-5">
        <Dialog.Title className="text-base font-semibold">Inbox</Dialog.Title>
        <Dialog.Close asChild><AppButton size="icon" variant="ghost" aria-label="Close notification inbox"><X className="size-4" /></AppButton></Dialog.Close>
      </header>
      <Dialog.Description className="px-5 pt-4 text-sm text-muted-foreground">System notifications and updates</Dialog.Description>
      <NotificationFeed businessId={businessId} canManage={canManage} />
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}

function NotificationFeed({ businessId, canManage }: { businessId: string; canManage: boolean }) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const notifications = useNotifications(businessId, { page, limit: 20, ...(unreadOnly ? { status: "UNREAD" as const } : {}) });
  const read = useMarkNotificationRead(businessId);
  const dismiss = useDismissNotification(businessId);
  const busy = read.isPending || dismiss.isPending;
  const failed = read.isError || dismiss.isError;
  const pages = notifications.data?.pagination?.totalPages ?? 1;
  return <>
    <div className="flex shrink-0 items-center gap-2 border-b px-5 py-3" aria-label="Notification filters">
      {[false, true].map(value => <AppButton key={String(value)} size="sm" variant={unreadOnly === value ? "secondary" : "ghost"} aria-pressed={unreadOnly === value} onClick={() => { setUnreadOnly(value); setPage(1); }}>{value ? "Unread" : "All"}</AppButton>)}
      <AppButton size="sm" variant="ghost" className="ml-auto" disabled={notifications.isFetching} onClick={() => void notifications.refetch()}>Refresh</AppButton>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
      {failed && <p role="alert" className="mb-3 text-sm text-destructive">Could not update this notification. Please try again.</p>}
      {notifications.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading notifications…</p>
        : notifications.isError ? <div role="alert"><p className="text-sm">Could not load notifications.</p><AppButton variant="ghost" size="sm" onClick={() => void notifications.refetch()}>Try again</AppButton></div>
        : !notifications.data?.data.length ? <div className="py-10 text-center"><Inbox className="mx-auto mb-3 size-6 text-muted-foreground" /><p className="text-sm font-medium">{unreadOnly ? "You’re all caught up" : "No notifications yet"}</p><p className="mt-1 text-xs text-muted-foreground">New updates will appear here.</p></div>
        : <ul className="divide-y">{notifications.data.data.map(item => <li key={item.id} className="py-4 first:pt-0">
          <div className="flex items-start gap-2"><span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", item.status === "UNREAD" ? "bg-primary" : "bg-transparent")} /><div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold">{item.title}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {item.status === "UNREAD" ? "Unread" : item.status === "READ" ? "Read" : item.status === "DISMISSED" ? "Dismissed" : "Handled"}</p>
            {canManage && item.status !== "DISMISSED" && <div className="mt-2 flex flex-wrap gap-2">
              {item.status === "UNREAD" && <AppButton size="sm" variant="ghost" disabled={busy} onClick={() => read.mutate(item.id)}>Mark as read</AppButton>}
              <AppButton size="sm" variant="ghost" disabled={busy} onClick={() => dismiss.mutate(item.id)}>Dismiss</AppButton>
            </div>}
          </div></div>
        </li>)}</ul>}
    </div>
    {(pages > 1 || page > 1) && <footer className="flex shrink-0 items-center justify-between border-t px-5 py-3">
      <AppButton size="sm" variant="ghost" disabled={page <= 1 || notifications.isFetching} onClick={() => setPage(value => value - 1)}>Previous</AppButton>
      <span className="text-xs text-muted-foreground">Page {page}</span>
      <AppButton size="sm" variant="ghost" disabled={page >= pages || notifications.isFetching} onClick={() => setPage(value => value + 1)}>Next</AppButton>
    </footer>}
  </>;
}
