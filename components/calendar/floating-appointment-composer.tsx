"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarPlus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { systemNotify } from "@/lib/system-notifications";
import { z } from "zod";
import { AppButton } from "@/components/app-button";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { AppCard } from "@/components/app-card";
import { AvailabilityPicker } from "@/components/calendar/availability-picker";
import { LocationPicker } from "@/components/calendar/location-picker";
import { PeopleSelector } from "@/components/calendar/people-selector";
import { useBusinessServices } from "@/hooks/use-business-services";
import { useBusinessLeads, useBusinessMembers, useCheckAppointmentAvailability, useCreateAppointment } from "@/hooks/use-calendar-appointments";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { applyApiFieldErrors } from "@/lib/form-errors";
import type { AppointmentAvailabilityResponse, AppointmentLocationType, CalendarAppointment } from "@/types/appointment";
import { ACTIONABLE_NOTIFICATION_CREATED_EVENT, type ActionableNotification } from "@/types/notification";

const appointmentSchema = z.object({
  title: z.string().trim().min(2, "Add an appointment title.").max(120, "Title must be 120 characters or less."),
  serviceId: z.string().min(1, "Select a service."),
  leadId: z.string().min(1, "Select a customer or lead."),
  assignedStaffId: z.string().optional(),
  locationType: z.enum(["BUSINESS_LOCATION", "CUSTOMER_LOCATION", "ONLINE", "PHONE_CALL", "TO_BE_CONFIRMED"]),
  location: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Select a start time."),
  notes: z.string().max(2000).optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

const defaultTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Accra";

function defaultValues(): AppointmentFormValues {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  return {
    title: "",
    serviceId: "",
    leadId: "",
    assignedStaffId: "",
    locationType: "TO_BE_CONFIRMED",
    location: "",
    date: format(now, "yyyy-MM-dd"),
    time: format(nextHour, "HH:mm"),
    notes: "",
  };
}

function appointmentErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return getApiErrorMessage(error);
  const messages: Record<string, string> = {
    APPOINTMENT_NOT_FOUND: "This appointment could not be found.",
    APPOINTMENT_SLOT_UNAVAILABLE: "This time slot is not available. Choose another time.",
    APPOINTMENT_OUTSIDE_BUSINESS_HOURS: "This time is outside your business hours.",
    APPOINTMENT_OVERLAPS_BREAK_TIME: "This time overlaps with a break period.",
    APPOINTMENT_SERVICE_NOT_BOOKABLE: "This service cannot be booked yet.",
    APPOINTMENT_SERVICE_DURATION_REQUIRED: "This service needs a duration before it can be booked.",
    APPOINTMENT_ALREADY_CANCELLED: "This appointment has already been cancelled.",
    APPOINTMENT_ALREADY_COMPLETED: "This appointment has already been completed.",
    APPOINTMENT_REASON_REQUIRED: "Please provide a reason before changing this appointment.",
    APPOINTMENT_LIMIT_REACHED: "Your current plan has reached the monthly appointment limit.",
    BUSINESS_CLOSED: "The business is closed at this time.",
    SERVICE_NOT_FOUND: "This service could not be found.",
    LEAD_NOT_FOUND: "This customer or lead could not be found.",
    CONVERSATION_NOT_FOUND: "This conversation could not be found.",
    STAFF_MEMBER_NOT_FOUND: "This staff member could not be found.",
    APPOINTMENT_STAFF_UNAVAILABLE: "The assigned staff member already has an appointment at this time.",
    INVALID_ASSIGNED_STAFF: "The selected staff member is not available for this business.",
    PLAN_UPGRADE_REQUIRED: error.message,
    INVALID_TIMEZONE: "The selected timezone is invalid.",
    INVALID_APPOINTMENT_STATUS: "This appointment status cannot be used here.",
    FORBIDDEN: "You do not have permission to manage this appointment.",
  };
  return messages[error.code] ?? error.message;
}

function showAppointmentCreatedNotification(businessId: string, appointment: CalendarAppointment) {
  const notification: ActionableNotification = {
    id: `local-appointment-created-${appointment.id}`,
    businessId,
    recipientMembershipId: "",
    type: "APPOINTMENT_CONFIRMED",
    priority: "NORMAL",
    title: "Appointment created",
    message: `${appointment.title} has been added to your calendar.`,
    entityType: "APPOINTMENT",
    entityId: appointment.id,
    actions: [],
    status: "UNREAD",
    createdAt: new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent(ACTIONABLE_NOTIFICATION_CREATED_EVENT, { detail: notification }));
}

export function FloatingAppointmentComposer({
  open,
  businessId,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  businessId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (appointment: CalendarAppointment) => void;
}) {
  const form = useForm<AppointmentFormValues>({ resolver: zodResolver(appointmentSchema), defaultValues: defaultValues() });
  const titleRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const values = useWatch({ control: form.control });
  const create = useCreateAppointment(businessId);
  const availabilityCheck = useCheckAppointmentAvailability();
  const checkAvailability = availabilityCheck.mutateAsync;
  const [availabilityState, setAvailabilityState] = useState<{ key: string; result: AppointmentAvailabilityResponse } | null>(null);
  const services = useBusinessServices(businessId, { status: "active", page: 1, limit: 100, sort: "displayOrder", sortOrder: "asc" });
  const leads = useBusinessLeads(businessId);
  const members = useBusinessMembers(businessId);

  const bookableServices = useMemo(() => (services.data?.items ?? []).filter((service) => service.isActive && !service.isArchived && service.isBookable), [services.data?.items]);
  const selectedService = bookableServices.find((service) => service.id === values.serviceId);
  const selectedLead = leads.data?.data.find((lead) => lead.id === values.leadId);
  const missingDuration = Boolean(selectedService && !selectedService.durationMinutes);
  const checkingAvailability = availabilityCheck.isPending;
  const availabilityKey = `${values.serviceId ?? ""}:${values.date ?? ""}:${values.time ?? ""}:${values.assignedStaffId ?? ""}:${selectedService?.durationMinutes ?? ""}`;
  const availability = availabilityState?.key === availabilityKey ? availabilityState.result : null;
  const titleField = form.register("title");

  const requestClose = useCallback((nextOpen: boolean) => {
    if (!nextOpen && form.formState.isDirty && !create.isPending) {
      const confirmed = window.confirm("Discard this appointment draft?");
      if (!confirmed) return;
    }
    onOpenChange(nextOpen);
  }, [create.isPending, form.formState.isDirty, onOpenChange]);

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues());
    }
  }, [form, open]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => titleRef.current?.focus(), 0);

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose(false);
    };
    const handlePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !panelRef.current || panelRef.current.contains(target)) return;
      if (target instanceof Element && target.closest("[data-radix-popper-content-wrapper], .app-select-content")) return;
      requestClose(false);
    };

    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [open, requestClose]);

  useEffect(() => {
    if (!open || !values.date || !values.time || !values.serviceId || missingDuration) {
      return;
    }

    let cancelled = false;
    const currentKey = availabilityKey;
    const timer = window.setTimeout(() => {
      checkAvailability({
        serviceId: values.serviceId,
        date: values.date!,
        time: values.time!,
        timezone: defaultTimezone(),
        assignedStaffId: values.assignedStaffId || null,
        durationMinutes: selectedService?.durationMinutes ?? undefined,
      }).then((result) => {
        if (!cancelled) setAvailabilityState({ key: currentKey, result });
      }).catch((error) => {
        if (!cancelled) setAvailabilityState({ key: currentKey, result: { available: false, reason: error instanceof ApiError ? error.code : "APPOINTMENT_SLOT_UNAVAILABLE", message: appointmentErrorMessage(error), suggestedSlots: [] } });
      });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [availabilityKey, checkAvailability, missingDuration, open, selectedService?.durationMinutes, values.assignedStaffId, values.date, values.serviceId, values.time]);

  const submit = form.handleSubmit(async (input) => {
    if (missingDuration) {
      form.setError("serviceId", { type: "manual", message: "This service has no duration. Add duration before booking." });
      return;
    }

    try {
      const checked = await checkAvailability({
        serviceId: input.serviceId,
        date: input.date,
        time: input.time,
        timezone: defaultTimezone(),
        assignedStaffId: input.assignedStaffId || null,
        durationMinutes: selectedService?.durationMinutes ?? undefined,
      });
      setAvailabilityState({ key: availabilityKey, result: checked });
      if (!checked.available) {
        systemNotify.error("Slot unavailable", { description: checked.message ?? "This time slot is not available. Choose another time." });
        return;
      }

      const appointment = await create.mutateAsync({
        leadId: input.leadId,
        serviceId: input.serviceId,
        assignedStaffId: input.assignedStaffId || null,
        customerName: selectedLead?.fullName ?? null,
        customerPhone: selectedLead?.phone ?? null,
        customerEmail: selectedLead?.email ?? null,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        date: input.date,
        time: input.time,
        timezone: defaultTimezone(),
        durationMinutes: selectedService?.durationMinutes ?? undefined,
        locationType: input.locationType,
        location: input.location?.trim() || null,
        source: "MANUAL",
      });
      showAppointmentCreatedNotification(businessId, appointment);
      form.reset(defaultValues());
      setAvailabilityState(null);
      onOpenChange(false);
      onCreated(appointment);
    } catch (error) {
      applyApiFieldErrors(error, form.setError);
      systemNotify.error("Could not create appointment", { description: appointmentErrorMessage(error) });
    }
  });

  if (!open) return null;

  return (
    <div className="fixed right-4 top-24 z-[70] w-[calc(100vw-2rem)] max-w-[420px] sm:right-6" role="dialog" aria-modal="false" aria-labelledby="floating-appointment-title">
      <div ref={panelRef} className="floating-appointment-composer flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_22px_70px_rgba(20,35,27,0.18),0_4px_16px_rgba(20,35,27,0.08)]">
        <div className="flex items-start justify-between gap-4 border-b px-4 py-3.5">
            <div>
              <h2 id="floating-appointment-title" className="text-base font-bold">New appointment</h2>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Create a manual booking for this business.</p>
            </div>
            <button type="button" onClick={() => requestClose(false)} className="grid size-10 place-items-center rounded-lg hover:bg-muted" aria-label="Close appointment composer">
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <AppFormField id="appointment-title" label="Appointment title" required error={form.formState.errors.title?.message}>
                <AppInput
                  id="appointment-title"
                  placeholder="e.g. Property Viewing with Kwame"
                  name={titleField.name}
                  onBlur={titleField.onBlur}
                  onChange={titleField.onChange}
                  ref={(node) => {
                    titleField.ref(node);
                    titleRef.current = node;
                  }}
                />
              </AppFormField>

              <Controller name="serviceId" control={form.control} render={({ field }) => (
                <AppFormField id="appointment-service" label="Service" required error={form.formState.errors.serviceId?.message} hint={missingDuration ? "This service has no duration. Add duration before booking." : undefined}>
                  <AppSelect
                    id="appointment-service"
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={services.isPending ? "Loading services..." : "Select a bookable service"}
                    disabled={services.isPending}
                    options={bookableServices.map((service) => ({ value: service.id, label: service.name, description: service.durationMinutes ? `${service.durationMinutes} min` : "Duration missing" }))}
                  />
                </AppFormField>
              )} />

              <PeopleSelector
                leads={leads.data?.data ?? []}
                staff={members.data}
                leadId={values.leadId ?? ""}
                staffId={values.assignedStaffId ?? ""}
                loadingLeads={leads.isPending}
                loadingStaff={members.isPending}
                leadError={form.formState.errors.leadId?.message}
                staffError={form.formState.errors.assignedStaffId?.message}
                onLeadChange={(value) => form.setValue("leadId", value, { shouldDirty: true, shouldValidate: true })}
                onStaffChange={(value) => form.setValue("assignedStaffId", value, { shouldDirty: true, shouldValidate: true })}
              />

              <Controller name="locationType" control={form.control} render={({ field }) => (
                <LocationPicker
                  value={field.value as AppointmentLocationType}
                  location={values.location ?? ""}
                  error={form.formState.errors.locationType?.message}
                  onChange={(value) => field.onChange(value)}
                  onLocationChange={(value) => form.setValue("location", value, { shouldDirty: true, shouldValidate: true })}
                />
              )} />

              <AvailabilityPicker
                date={values.date ?? ""}
                time={values.time ?? ""}
                dateError={form.formState.errors.date?.message}
                timeError={form.formState.errors.time?.message}
                availability={availability}
                checking={checkingAvailability}
                onDateChange={(value) => form.setValue("date", value, { shouldDirty: true, shouldValidate: true })}
                onTimeChange={(value) => form.setValue("time", value, { shouldDirty: true, shouldValidate: true })}
              />

              <AppFormField id="appointment-notes" label="Notes">
                <textarea id="appointment-notes" rows={3} className="w-full resize-y rounded-lg border border-input bg-card px-3 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20" placeholder="Add context for the team." {...form.register("notes")} />
              </AppFormField>

              <AppCard className="bg-background/80 p-3 shadow-none">
                <p className="text-sm font-bold">No automatic messages yet</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Creating this appointment stores it internally. It will not send WhatsApp confirmations or AI replies in this module.</p>
              </AppCard>
            </div>

            <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t bg-card py-3">
              <AppButton type="button" size="sm" variant="outline" onClick={() => requestClose(false)}>Cancel</AppButton>
              <AppButton type="submit" size="sm" loading={create.isPending || availabilityCheck.isPending} loadingText="Creating" disabled={missingDuration || availability?.available === false}>
                <CalendarPlus className="size-4" />Create appointment
              </AppButton>
            </div>
          </form>
      </div>
    </div>
  );
}
