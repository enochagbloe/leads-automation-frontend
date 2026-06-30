"use client";

import { format } from "date-fns";
import { CalendarDays, Clock3, FileText, MapPin, MoreVertical, NotebookPen, UserRound, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { AppButton } from "@/components/app-button";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { AppEmptyState } from "@/components/app-empty-state";
import { AppErrorState } from "@/components/app-error-state";
import { LoadingCard } from "@/components/states/loading-states";
import { useCurrentUser } from "@/hooks/use-auth";
import { useAppointment } from "@/hooks/use-calendar-appointments";
import { getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { AppointmentActivity, CalendarAppointment } from "@/types/appointment";

function staffName(appointment: CalendarAppointment) {
  if (appointment.assignedStaff?.name) return appointment.assignedStaff.name;
  const user = appointment.assignedStaff?.user;
  return user ? `${user.firstName} ${user.lastName}` : "No staff assigned";
}

function customerName(appointment: CalendarAppointment) {
  return appointment.lead?.fullName || stringField(appointment, "customerName") || "Customer not provided";
}

function customerContact(appointment: CalendarAppointment) {
  const phone = stringField(appointment, "customerPhone");
  const email = stringField(appointment, "customerEmail");
  if (phone) return phone;
  if (email) return email;
  return appointment.lead?.phone || appointment.lead?.email || "Contact not provided";
}

function stringField(value: unknown, key: string) {
  if (!value || typeof value !== "object") return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field : undefined;
}

function timeRange(appointment: CalendarAppointment) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Time not available";
  return `${format(start, "PPp")} - ${format(end, "p")}`;
}

function dateLabel(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return format(date, "PPp");
}

function locationLabel(appointment: CalendarAppointment) {
  return appointment.location ?? appointment.locationType.replaceAll("_", " ").toLowerCase();
}

export function AppointmentDetailDialog({
  appointment,
  canAssignStaff,
  onAssign,
  onOpenChange,
}: {
  appointment: CalendarAppointment | null;
  canAssignStaff?: boolean;
  onAssign: (appointment: CalendarAppointment) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const open = Boolean(appointment);
  const profile = useCurrentUser();
  const detail = useAppointment(profile.data?.activeBusiness?.id, appointment?.id);
  const [activeTab, setActiveTab] = useState<"activity" | "notes" | "details" | "actions">("activity");
  const selected = detail.data?.appointment ?? appointment;
  const activities = detail.data?.activities ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-card p-0 shadow-[0_24px_80px_rgba(20,35,27,0.22)]">
          {selected && (
            <>
              <DialogTitle className="sr-only">{selected.title}</DialogTitle>
              <DialogDescription className="sr-only">Appointment lifecycle and staff assignment details.</DialogDescription>
              <div className="flex h-14 items-center justify-between gap-3 border-b px-3">
                <AppButton size="icon" variant="ghost" onClick={() => onOpenChange(false)} aria-label="Close appointment details"><X className="size-5" /></AppButton>
                <div className="flex items-center gap-1">
                  <AppButton size="icon" variant="ghost" disabled aria-label="Appointment activity"><Clock3 className="size-4" /></AppButton>
                  <AppButton size="icon" variant="ghost" disabled aria-label="More appointment options"><MoreVertical className="size-4" /></AppButton>
                </div>
              </div>

              {detail.isPending && !detail.data ? <div className="space-y-4 p-5"><LoadingCard /><LoadingCard /></div> : detail.isError ? (
                <div className="p-5">
                  <AppErrorState title="Could not load appointment details" description={getApiErrorMessage(detail.error)} onRetry={() => void detail.refetch()} />
                </div>
              ) : (
                <div className="max-h-[calc(100dvh-5.5rem)] overflow-y-auto">
                  <section className="px-5 pb-5 pt-5 sm:px-6">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Appointment detail</p>
                    <h2 className="mt-3 text-2xl font-bold leading-8 tracking-tight">{selected.title}</h2>
                    <div className="mt-5 space-y-3 text-sm">
                      <PanelMetaRow icon={Clock3} label="Date & time" value={timeRange(selected)} />
                      <PanelMetaRow icon={CalendarDays} label="Service" value={selected.service?.name ?? "Service not provided"} />
                      <PanelMetaRow icon={UserRound} label="Customer" value={customerName(selected)} />
                      <PanelMetaRow icon={MapPin} label="Location" value={locationLabel(selected)} />
                      <PanelMetaRow icon={UserRound} label="Assigned staff" value={staffName(selected)} />
                      <PanelMetaRow icon={FileText} label="Status" value={<AppointmentStatusBadge status={selected.status} />} />
                    </div>

                    <div className="mt-6 rounded-2xl bg-muted/55 p-4">
                      <h3 className="text-sm font-bold">Appointment context</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {stringField(selected, "description") ?? selected.humanConfirmationReason ?? selected.service?.name ?? "Review the booking details, customer context, and lifecycle status before taking action."}
                      </p>
                      {selected.status === "NEEDS_OUTCOME_CONFIRMATION" && <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold leading-5 text-warning">This appointment needs an outcome. Mark it as completed, no-show, or missed.</p>}
                      {selected.autoConfirmed && <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold leading-5 text-primary">Auto-confirmed because staff was assigned.</p>}
                    </div>
                  </section>

                  <nav className="sticky top-0 z-10 flex overflow-x-auto border-y bg-card/95 px-5 backdrop-blur sm:px-6" aria-label="Appointment detail tabs">
                    {[
                      ["activity", `Activity ${activities.length}`],
                      ["notes", "Notes"],
                      ["details", "Details"],
                      ["actions", "Actions"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key as typeof activeTab)}
                        className={cn("min-h-12 shrink-0 border-b-2 border-transparent px-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground", activeTab === key && "border-primary text-primary")}
                      >
                        {label}
                      </button>
                    ))}
                  </nav>

                  <section className="px-5 py-5 sm:px-6">
                    {activeTab === "activity" && <AppointmentActivityTimeline activities={activities} />}
                    {activeTab === "notes" && (
                      stringField(selected, "notes") ? (
                        <article className="rounded-2xl bg-muted/55 p-4">
                          <h3 className="text-sm font-bold">Appointment notes</h3>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{stringField(selected, "notes")}</p>
                        </article>
                      ) : <AppEmptyState className="min-h-40 border-0" icon={NotebookPen} title="No notes yet" description="Appointment notes will appear here when available." />
                    )}
                    {activeTab === "details" && (
                      <dl className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2">
                        <DetailCell label="Customer contact" value={customerContact(selected)} />
                        <DetailCell label="Source" value={selected.source.replaceAll("_", " ").toLowerCase()} />
                        <DetailCell label="Timezone" value={selected.timezone} />
                        <DetailCell label="Location status" value={selected.locationStatus.replaceAll("_", " ").toLowerCase()} />
                        <DetailCell label="Reschedule count" value={String(selected.rescheduleCount ?? 0)} />
                        <DetailCell label="Outcome required" value={dateLabel(stringField(selected, "outcomeRequiredAt"))} />
                        {stringField(selected, "createdAt") && <DetailCell label="Created" value={dateLabel(stringField(selected, "createdAt"))} />}
                        {stringField(selected, "updatedAt") && <DetailCell label="Updated" value={dateLabel(stringField(selected, "updatedAt"))} />}
                      </dl>
                    )}
                    {activeTab === "actions" && (
                      <div>
                        <h3 className="text-sm font-bold">Appointment actions</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">Manage staff ownership and close this detail view.</p>
                        <div className="mt-4 flex justify-end gap-2">
                          {canAssignStaff && (
                            <AppButton type="button" variant="outline" onClick={() => onAssign(selected)}>
                              Assign staff
                            </AppButton>
                          )}
                          <AppButton type="button" onClick={() => onOpenChange(false)}>Done</AppButton>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

function PanelMetaRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[1rem_minmax(7rem,0.38fr)_minmax(0,1fr)] items-center gap-3">
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-card p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-semibold capitalize">{value}</dd>
    </div>
  );
}

function AppointmentActivityTimeline({ activities }: { activities: AppointmentActivity[] }) {
  if (!activities.length) return <AppEmptyState className="min-h-40 border-0" icon={Clock3} title="No activity yet" description="Appointment lifecycle events will appear here." />;
  return (
    <ol className="space-y-4">
      {activities.slice(0, 6).map((activity) => (
        <li key={activity.id} className="flex gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Clock3 className="size-4" /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{activity.type.replaceAll("_", " ").toLowerCase()}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{dateLabel(activity.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
