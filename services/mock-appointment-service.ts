import { addMinutes, formatISO } from "date-fns";
import { appointmentDateKey } from "@/lib/appointment-dates";
import type {
  AssignAppointmentInput,
  AppointmentActivity,
  AppointmentAvailabilityResponse,
  AppointmentAutoConfirmSettings,
  AppointmentCalendarQuery,
  AppointmentCalendarResponse,
  AppointmentDetail,
  AppointmentDetailResponse,
  AppointmentListQuery,
  AppointmentListResponse,
  AppointmentSettings,
  CalendarAppointment,
  CancelAppointmentInput,
  CompleteAppointmentInput,
  ConfirmAppointmentInput,
  CreateAppointmentInput,
  MissedAppointmentInput,
  NoShowAppointmentInput,
  RescheduleAppointmentInput,
  UpdateAppointmentAutoConfirmSettingsInput,
  UpdateAppointmentSettingsInput,
} from "@/types/appointment";

const now = new Date();
let appointmentSettings: AppointmentSettings = {
  appointmentConfirmationMode: "MANUAL_CONFIRMATION_REQUIRED",
  updatedAt: now.toISOString(),
};

let autoConfirmSettings: AppointmentAutoConfirmSettings = {
  aiAutoConfirmAppointmentsEnabled: false,
  updatedAt: now.toISOString(),
};

let appointments: CalendarAppointment[] = [
  {
    id: "appt_demo_pending",
    title: "Client Consultation - New Build",
    status: "PENDING_BUSINESS_CONFIRMATION",
    source: "CUSTOMER_REQUESTED",
    startTime: formatISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0)),
    endTime: formatISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0)),
    timezone: "Africa/Accra",
    locationType: "TO_BE_CONFIRMED",
    locationStatus: "NEEDS_CONFIRMATION",
    location: null,
    assignedStaffId: "member_demo",
    leadId: "lead_demo_ama",
    conversationId: "conv_demo_ama",
    serviceId: "svc_demo_consultation",
    lead: { id: "lead_demo_ama", fullName: "Ama Boateng", phone: "+233 20 555 0198", email: "ama@example.com" },
    service: { id: "svc_demo_consultation", name: "Consultation", durationMinutes: 60 },
    assignedStaff: { id: "member_demo", role: "BUSINESS_OWNER", user: { id: "usr_demo", firstName: "Enoch", lastName: "Agbloe", email: "enoch@example.com" } },
    availableActions: ["CONFIRM", "RESCHEDULE", "CANCEL"],
    humanConfirmationRequired: true,
    humanConfirmationReason: "BUSINESS_CONFIRMATION_REQUIRED",
    rescheduleCount: 0,
    outcomeRequiredAt: null,
    outcomeConfirmedAt: null,
    appointmentConfirmationMode: "MANUAL_CONFIRMATION_REQUIRED",
    confirmationSource: "AI_REQUEST",
    autoConfirmedAt: null,
    autoConfirmDecisionReason: null,
    autoConfirmFailedReason: "Business confirmation is required before this request can be confirmed.",
    autoConfirmConfidence: 0.74,
  },
  {
    id: "appt_demo_1",
    title: "Property Viewing with Kwame",
    status: "NEEDS_HUMAN_CONFIRMATION",
    source: "MANUAL",
    startTime: formatISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0)),
    endTime: formatISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 45)),
    timezone: "Africa/Accra",
    locationType: "TO_BE_CONFIRMED",
    locationStatus: "NEEDS_CONFIRMATION",
    location: null,
    assignedStaffId: "member_demo",
    leadId: "lead_demo_kwame",
    conversationId: null,
    serviceId: "svc_demo_viewing",
    lead: { id: "lead_demo_kwame", fullName: "Kwame Mensah", phone: "+233 24 123 4567", email: "kwame@example.com" },
    service: { id: "svc_demo_viewing", name: "Property Viewing", durationMinutes: 45 },
    assignedStaff: { id: "member_demo", role: "BUSINESS_OWNER", user: { id: "usr_demo", firstName: "Enoch", lastName: "Agbloe", email: "enoch@example.com" } },
    availableActions: ["CONFIRM", "RESCHEDULE", "CANCEL"],
    humanConfirmationRequired: true,
    humanConfirmationReason: "LOCATION_REQUIRED",
    rescheduleCount: 0,
    outcomeRequiredAt: null,
    outcomeConfirmedAt: null,
    appointmentConfirmationMode: "MANUAL_CONFIRMATION_REQUIRED",
    confirmationSource: "AI_REQUEST",
    autoConfirmedAt: null,
    autoConfirmDecisionReason: null,
    autoConfirmFailedReason: "Location must be confirmed before this appointment can be auto-confirmed.",
    autoConfirmConfidence: 0.68,
  },
  {
    id: "appt_demo_outcome",
    title: "Follow-up Call - John Mensah",
    status: "NEEDS_OUTCOME_CONFIRMATION",
    source: "MANUAL",
    startTime: formatISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0)),
    endTime: formatISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30)),
    timezone: "Africa/Accra",
    locationType: "PHONE_CALL",
    locationStatus: "NOT_REQUIRED",
    location: "Phone call",
    assignedStaffId: "member_demo",
    leadId: "lead_demo_john",
    conversationId: null,
    serviceId: "svc_demo_followup",
    lead: { id: "lead_demo_john", fullName: "John Mensah", phone: "+233 27 555 0123", email: "john@example.com" },
    service: { id: "svc_demo_followup", name: "Follow-up Call", durationMinutes: 30 },
    assignedStaff: { id: "member_demo", role: "BUSINESS_OWNER", user: { id: "usr_demo", firstName: "Enoch", lastName: "Agbloe", email: "enoch@example.com" } },
    availableActions: ["COMPLETE", "NO_SHOW", "MISSED"],
    humanConfirmationRequired: false,
    humanConfirmationReason: null,
    rescheduleCount: 1,
    outcomeRequiredAt: formatISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 35)),
    outcomeConfirmedAt: null,
    appointmentConfirmationMode: "MANUAL_CONFIRMATION_REQUIRED",
    confirmationSource: "MANUAL",
    autoConfirmedAt: null,
    autoConfirmDecisionReason: null,
    autoConfirmFailedReason: null,
    autoConfirmConfidence: null,
  },
];

const delay = () => new Promise((resolve) => setTimeout(resolve, 450));

const activities: AppointmentActivity[] = [
  {
    id: "appt_activity_demo_1",
    appointmentId: "appt_demo_1",
    businessId: "biz_demo",
    actorUserId: "usr_demo",
    actorMembershipId: "member_demo",
    type: "APPOINTMENT_CREATED",
    metadata: { source: "MANUAL" },
    createdAt: now.toISOString(),
  },
];

function toDetail(appointment: CalendarAppointment): AppointmentDetail {
  const appointmentDate = appointmentDateKey(appointment.startTime, appointment.timezone);

  return {
    ...appointment,
    businessId: "biz_demo",
    businessAccountId: "acct_demo",
    customerName: appointment.lead?.fullName ?? null,
    customerPhone: appointment.lead?.phone ?? null,
    customerEmail: appointment.lead?.email ?? null,
    description: null,
    notes: null,
    appointmentDate,
    humanConfirmationRequired: appointment.humanConfirmationRequired ?? (appointment.status === "NEEDS_HUMAN_CONFIRMATION" || appointment.status === "PENDING_BUSINESS_CONFIRMATION"),
    humanConfirmationReason: appointment.humanConfirmationReason ?? (appointment.status === "NEEDS_HUMAN_CONFIRMATION" ? "LOCATION_REQUIRED" : appointment.status === "PENDING_BUSINESS_CONFIRMATION" ? "BUSINESS_CONFIRMATION_REQUIRED" : null),
    cancellationReason: null,
    rescheduleReason: null,
    completedNote: null,
    noShowReason: null,
    missedReason: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function findAppointment(id: string) {
  const appointment = appointments.find((item) => item.id === id);
  if (!appointment) throw new Error("Appointment not found.");
  return appointment;
}

function replaceAppointment(next: CalendarAppointment) {
  appointments = appointments.map((appointment) => appointment.id === next.id ? next : appointment).sort((a, b) => a.startTime.localeCompare(b.startTime));
  return toDetail(next);
}

function inRange(appointment: CalendarAppointment, query: AppointmentCalendarQuery) {
  const day = appointmentDateKey(appointment.startTime, appointment.timezone);
  return day >= query.dateFrom && day <= query.dateTo;
}

export const mockAppointmentService = {
  async calendar(query: AppointmentCalendarQuery): Promise<AppointmentCalendarResponse> {
    await delay();
    return {
      view: query.view,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      appointments: appointments
        .filter((appointment) => inRange(appointment, query))
        .filter((appointment) => !query.assignedStaffId || (query.assignedStaffId === "unassigned" ? !appointment.assignedStaffId : appointment.assignedStaffId === query.assignedStaffId))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    };
  },
  async list(query: AppointmentListQuery): Promise<AppointmentListResponse> {
    await delay();
    const filtered = appointments
      .filter((appointment) => !query.status || appointment.status === query.status)
      .filter((appointment) => !query.source || appointment.source === query.source)
      .filter((appointment) => !query.serviceId || appointment.serviceId === query.serviceId)
      .filter((appointment) => !query.assignedStaffId || (query.assignedStaffId === "unassigned" ? !appointment.assignedStaffId : appointment.assignedStaffId === query.assignedStaffId))
      .filter((appointment) => !query.leadId || appointment.leadId === query.leadId)
      .filter((appointment) => !query.conversationId || appointment.conversationId === query.conversationId)
      .filter((appointment) => !query.dateFrom || appointmentDateKey(appointment.startTime, appointment.timezone) >= query.dateFrom)
      .filter((appointment) => !query.dateTo || appointmentDateKey(appointment.startTime, appointment.timezone) <= query.dateTo)
      .filter((appointment) => {
        if (!query.search) return true;
        const search = query.search.toLowerCase();
        return [appointment.title, appointment.lead?.fullName, appointment.lead?.phone, appointment.service?.name].some((value) => value?.toLowerCase().includes(search));
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const page = query.page || 1;
    const limit = query.limit || 20;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit).map(toDetail);
    return {
      data,
      summary: {
        total: filtered.length,
        byStatus: filtered.reduce((counts, appointment) => ({ ...counts, [appointment.status]: (counts[appointment.status] ?? 0) + 1 }), {} as AppointmentListResponse["summary"]["byStatus"]),
      },
      pagination: { page, limit, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / limit)) },
    };
  },
  async detail(appointmentId: string): Promise<AppointmentDetailResponse> {
    await delay();
    const appointment = findAppointment(appointmentId);
    return {
      appointment: toDetail(appointment),
      activities: activities.filter((activity) => activity.appointmentId === appointmentId),
    };
  },
  async checkAvailability(input: { date: string; time: string; durationMinutes?: number }): Promise<AppointmentAvailabilityResponse> {
    await delay();
    const [hour] = input.time.split(":").map(Number);
    if (hour! < 8 || hour! > 18) {
      return { available: false, reason: "APPOINTMENT_OUTSIDE_BUSINESS_HOURS", message: "This time is outside your business hours.", suggestedSlots: [] };
    }
    const start = new Date(`${input.date}T${input.time}:00`);
    const end = addMinutes(start, input.durationMinutes ?? 45);
    return { available: true, reason: null, startTime: start.toISOString(), endTime: end.toISOString(), durationMinutes: input.durationMinutes ?? 45, warnings: [] };
  },
  async settings(): Promise<AppointmentSettings> {
    await delay();
    return appointmentSettings;
  },
  async updateSettings(input: UpdateAppointmentSettingsInput): Promise<AppointmentSettings> {
    await delay();
    appointmentSettings = { appointmentConfirmationMode: input.appointmentConfirmationMode, updatedAt: new Date().toISOString() };
    return appointmentSettings;
  },
  async autoConfirmSettings(): Promise<AppointmentAutoConfirmSettings> {
    await delay();
    return autoConfirmSettings;
  },
  async updateAutoConfirmSettings(input: UpdateAppointmentAutoConfirmSettingsInput): Promise<AppointmentAutoConfirmSettings> {
    await delay();
    autoConfirmSettings = { aiAutoConfirmAppointmentsEnabled: input.aiAutoConfirmAppointmentsEnabled, updatedAt: new Date().toISOString() };
    appointmentSettings = {
      appointmentConfirmationMode: input.aiAutoConfirmAppointmentsEnabled ? "AUTO_CONFIRM_SAFE_BOOKINGS" : "MANUAL_CONFIRMATION_REQUIRED",
      updatedAt: autoConfirmSettings.updatedAt,
    };
    return autoConfirmSettings;
  },
  async create(input: CreateAppointmentInput): Promise<CalendarAppointment> {
    await delay();
    const [hour, minute] = input.time.split(":").map(Number);
    const start = new Date(`${input.date}T${input.time}:00`);
    const end = addMinutes(start, input.durationMinutes ?? 45);
    const safeForAutoConfirm = input.locationType !== "TO_BE_CONFIRMED" && !input.notes?.toLowerCase().includes("unsafe");
    const autoConfirmWithStaff = appointmentSettings.appointmentConfirmationMode === "AUTO_CONFIRM_WHEN_STAFF_ASSIGNED" && Boolean(input.assignedStaffId);
    const safeAutoConfirmed = autoConfirmSettings.aiAutoConfirmAppointmentsEnabled && safeForAutoConfirm;
    const autoConfirmSkipped = autoConfirmSettings.aiAutoConfirmAppointmentsEnabled && !safeAutoConfirmed;
    const autoConfirmedAt = autoConfirmWithStaff || safeAutoConfirmed ? new Date().toISOString() : null;
    const appointment: CalendarAppointment = {
      id: `appt_${Date.now()}`,
      title: input.title,
      status: autoConfirmWithStaff || safeAutoConfirmed ? "CONFIRMED" : input.locationType === "TO_BE_CONFIRMED" || appointmentSettings.appointmentConfirmationMode === "AUTO_CONFIRM_SAFE_BOOKINGS" ? "NEEDS_HUMAN_CONFIRMATION" : "PENDING_BUSINESS_CONFIRMATION",
      source: input.source ?? "MANUAL",
      startTime: Number.isNaN(start.getTime()) ? formatISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour ?? 9, minute ?? 0)) : start.toISOString(),
      endTime: Number.isNaN(end.getTime()) ? formatISO(addMinutes(new Date(), 45)) : end.toISOString(),
      timezone: input.timezone,
      locationType: input.locationType,
      locationStatus: input.locationType === "TO_BE_CONFIRMED" ? "NEEDS_CONFIRMATION" : input.locationType === "ONLINE" || input.locationType === "PHONE_CALL" ? "NOT_REQUIRED" : "CONFIRMED",
      location: input.location ?? null,
      assignedStaffId: input.assignedStaffId ?? "member_demo",
      leadId: input.leadId ?? null,
      conversationId: input.conversationId ?? null,
      serviceId: input.serviceId ?? null,
      lead: input.leadId ? { id: input.leadId, fullName: input.customerName ?? "Selected customer", phone: input.customerPhone ?? null, email: input.customerEmail ?? null } : null,
      service: input.serviceId ? { id: input.serviceId, name: "Selected service", durationMinutes: input.durationMinutes ?? 45 } : null,
      assignedStaff: { id: input.assignedStaffId ?? "member_demo", role: "BUSINESS_OWNER", user: { id: "usr_demo", firstName: "Enoch", lastName: "Agbloe", email: "enoch@example.com" } },
      availableActions: autoConfirmWithStaff || safeAutoConfirmed ? ["RESCHEDULE", "CANCEL", "COMPLETE", "NO_SHOW"] : ["CONFIRM", "RESCHEDULE", "CANCEL"],
      humanConfirmationRequired: !autoConfirmWithStaff && !safeAutoConfirmed && (input.locationType === "TO_BE_CONFIRMED" || appointmentSettings.appointmentConfirmationMode === "AUTO_CONFIRM_SAFE_BOOKINGS"),
      humanConfirmationReason: input.locationType === "TO_BE_CONFIRMED" ? "LOCATION_REQUIRED" : appointmentSettings.appointmentConfirmationMode === "AUTO_CONFIRM_SAFE_BOOKINGS" && !safeForAutoConfirm ? "SAFETY_REVIEW_REQUIRED" : null,
      rescheduleCount: 0,
      outcomeRequiredAt: null,
      outcomeConfirmedAt: null,
      appointmentConfirmationMode: appointmentSettings.appointmentConfirmationMode,
      autoConfirmed: autoConfirmWithStaff || safeAutoConfirmed,
      confirmationSource: safeAutoConfirmed ? "AI_PREMIUM_AUTO_CONFIRM" : input.source === "AI_CREATED" || autoConfirmSkipped ? "AI_REQUEST" : "MANUAL",
      autoConfirmedAt,
      autoConfirmDecisionReason: safeAutoConfirmed ? "All premium auto-confirmation checks passed." : null,
      autoConfirmFailedReason: autoConfirmSkipped ? (input.locationType === "TO_BE_CONFIRMED" ? "Customer location must be confirmed first." : "The appointment request needs human review before confirmation.") : null,
      autoConfirmConfidence: safeAutoConfirmed ? 0.93 : autoConfirmSkipped ? 0.62 : null,
    };
    appointments = [...appointments, appointment].sort((a, b) => a.startTime.localeCompare(b.startTime));
    return appointment;
  },
  async confirm(appointmentId: string, input: ConfirmAppointmentInput): Promise<AppointmentDetail> {
    await delay();
    void input;
    return replaceAppointment({
      ...findAppointment(appointmentId),
      status: "CONFIRMED",
      locationStatus: "CONFIRMED",
      humanConfirmationRequired: false,
      humanConfirmationReason: null,
      availableActions: ["RESCHEDULE", "CANCEL", "COMPLETE", "NO_SHOW"],
      outcomeRequiredAt: null,
      outcomeConfirmedAt: null,
    });
  },
  async reschedule(appointmentId: string, input: RescheduleAppointmentInput): Promise<AppointmentDetail> {
    await delay();
    const reason = input.reason ?? input.rescheduleReason;
    if (!reason?.trim()) throw new Error("Please provide a reason before rescheduling this appointment.");
    const appointment = findAppointment(appointmentId);
    if ((appointment.rescheduleCount ?? 0) >= 1) throw new Error("This appointment has already been rescheduled once. Please create a new appointment request instead.");
    if (new Date(appointment.endTime).getTime() < Date.now()) throw new Error("Past appointments cannot be rescheduled. Please record the appointment outcome or create a new appointment.");
    const date = input.date ?? input.newDate;
    const time = input.time ?? input.newStartTime;
    const start = new Date(`${date}T${time}:00`);
    const duration = appointment.service?.durationMinutes ?? 45;
    return replaceAppointment({
      ...appointment,
      status: "RESCHEDULED",
      startTime: start.toISOString(),
      endTime: addMinutes(start, duration).toISOString(),
      timezone: input.timezone,
      rescheduleCount: (appointment.rescheduleCount ?? 0) + 1,
      availableActions: ["CANCEL", "COMPLETE", "NO_SHOW"],
    });
  },
  async cancel(appointmentId: string, input: CancelAppointmentInput): Promise<AppointmentDetail> {
    await delay();
    const reason = input.reason ?? input.cancellationReason;
    if (!reason?.trim()) throw new Error("Please provide a reason before cancelling this appointment.");
    return replaceAppointment({ ...findAppointment(appointmentId), status: "CANCELLED", availableActions: [] });
  },
  async complete(appointmentId: string, input: CompleteAppointmentInput = {}): Promise<AppointmentDetail> {
    await delay();
    void input;
    return replaceAppointment({ ...findAppointment(appointmentId), status: "COMPLETED", outcomeConfirmedAt: new Date().toISOString(), availableActions: [] });
  },
  async noShow(appointmentId: string, input: NoShowAppointmentInput = {}): Promise<AppointmentDetail> {
    await delay();
    void input;
    return replaceAppointment({ ...findAppointment(appointmentId), status: "NO_SHOW", outcomeConfirmedAt: new Date().toISOString(), availableActions: [] });
  },
  async missed(appointmentId: string, input: MissedAppointmentInput = {}): Promise<AppointmentDetail> {
    await delay();
    void input;
    return replaceAppointment({ ...findAppointment(appointmentId), status: "MISSED", outcomeConfirmedAt: new Date().toISOString(), availableActions: [] });
  },
  async assign(appointmentId: string, input: AssignAppointmentInput): Promise<AppointmentDetail> {
    await delay();
    const appointment = findAppointment(appointmentId);
    const autoConfirmWithStaff = appointmentSettings.appointmentConfirmationMode === "AUTO_CONFIRM_WHEN_STAFF_ASSIGNED" && Boolean(input.assignedStaffId);
    return replaceAppointment({
      ...appointment,
      assignedStaffId: input.assignedStaffId,
      assignedStaff: input.assignedStaffId
        ? { id: input.assignedStaffId, role: "MANAGER", user: { id: "usr_assigned", firstName: "Assigned", lastName: "Staff", email: "assigned@example.com" } }
        : null,
      status: autoConfirmWithStaff ? "CONFIRMED" : appointment.status,
      availableActions: autoConfirmWithStaff ? ["RESCHEDULE", "CANCEL", "COMPLETE", "NO_SHOW"] : appointment.availableActions,
      appointmentConfirmationMode: appointmentSettings.appointmentConfirmationMode,
      autoConfirmed: autoConfirmWithStaff || appointment.autoConfirmed,
      confirmationSource: autoConfirmWithStaff ? "AI_PREMIUM_AUTO_CONFIRM" : appointment.confirmationSource,
      autoConfirmedAt: autoConfirmWithStaff ? new Date().toISOString() : appointment.autoConfirmedAt,
      autoConfirmDecisionReason: autoConfirmWithStaff ? "Staff assignment allowed safe automatic confirmation." : appointment.autoConfirmDecisionReason,
      autoConfirmFailedReason: autoConfirmWithStaff ? null : appointment.autoConfirmFailedReason,
      autoConfirmConfidence: autoConfirmWithStaff ? 0.88 : appointment.autoConfirmConfidence,
    });
  },
  async claim(appointmentId: string): Promise<AppointmentDetail> {
    await delay();
    const appointment = findAppointment(appointmentId);
    if (appointment.assignedStaffId) throw new Error("This appointment is already assigned to another team member.");
    return replaceAppointment({
      ...appointment,
      assignedStaffId: "member_demo",
      assignedStaff: { id: "member_demo", role: "STAFF", user: { id: "usr_demo", firstName: "Enoch", lastName: "Agbloe", email: "enoch@example.com" } },
    });
  },
};
