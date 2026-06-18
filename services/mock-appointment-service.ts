import { addMinutes, formatISO } from "date-fns";
import type {
  AssignAppointmentInput,
  AppointmentActivity,
  AppointmentAvailabilityResponse,
  AppointmentCalendarQuery,
  AppointmentCalendarResponse,
  AppointmentDetail,
  AppointmentDetailResponse,
  AppointmentListQuery,
  AppointmentListResponse,
  CalendarAppointment,
  CancelAppointmentInput,
  CreateAppointmentInput,
  RescheduleAppointmentInput,
} from "@/types/appointment";

const now = new Date();

let appointments: CalendarAppointment[] = [
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
  return {
    ...appointment,
    businessId: "biz_demo",
    businessAccountId: "acct_demo",
    customerName: appointment.lead?.fullName ?? null,
    customerPhone: appointment.lead?.phone ?? null,
    customerEmail: appointment.lead?.email ?? null,
    description: null,
    notes: null,
    appointmentDate: appointment.startTime.slice(0, 10),
    humanConfirmationRequired: appointment.status === "NEEDS_HUMAN_CONFIRMATION",
    humanConfirmationReason: appointment.status === "NEEDS_HUMAN_CONFIRMATION" ? "LOCATION_REQUIRED" : null,
    cancellationReason: null,
    rescheduleReason: null,
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
  const day = appointment.startTime.slice(0, 10);
  return day >= query.dateFrom && day <= query.dateTo;
}

export const mockAppointmentService = {
  async calendar(query: AppointmentCalendarQuery): Promise<AppointmentCalendarResponse> {
    await delay();
    return {
      view: query.view,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      appointments: appointments.filter((appointment) => inRange(appointment, query)).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    };
  },
  async list(query: AppointmentListQuery): Promise<AppointmentListResponse> {
    await delay();
    const filtered = appointments
      .filter((appointment) => !query.status || appointment.status === query.status)
      .filter((appointment) => !query.source || appointment.source === query.source)
      .filter((appointment) => !query.serviceId || appointment.serviceId === query.serviceId)
      .filter((appointment) => !query.assignedStaffId || appointment.assignedStaffId === query.assignedStaffId)
      .filter((appointment) => !query.leadId || appointment.leadId === query.leadId)
      .filter((appointment) => !query.conversationId || appointment.conversationId === query.conversationId)
      .filter((appointment) => !query.dateFrom || appointment.startTime.slice(0, 10) >= query.dateFrom)
      .filter((appointment) => !query.dateTo || appointment.startTime.slice(0, 10) <= query.dateTo)
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
  async create(input: CreateAppointmentInput): Promise<CalendarAppointment> {
    await delay();
    const [hour, minute] = input.time.split(":").map(Number);
    const start = new Date(`${input.date}T${input.time}:00`);
    const end = addMinutes(start, input.durationMinutes ?? 45);
    const appointment: CalendarAppointment = {
      id: `appt_${Date.now()}`,
      title: input.title,
      status: input.locationType === "TO_BE_CONFIRMED" ? "NEEDS_HUMAN_CONFIRMATION" : "CONFIRMED",
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
    };
    appointments = [...appointments, appointment].sort((a, b) => a.startTime.localeCompare(b.startTime));
    return appointment;
  },
  async reschedule(appointmentId: string, input: RescheduleAppointmentInput): Promise<AppointmentDetail> {
    await delay();
    if (!input.reason.trim()) throw new Error("Please provide a reason before rescheduling this appointment.");
    const appointment = findAppointment(appointmentId);
    const start = new Date(`${input.date}T${input.time}:00`);
    const duration = appointment.service?.durationMinutes ?? 45;
    return replaceAppointment({
      ...appointment,
      status: "RESCHEDULED",
      startTime: start.toISOString(),
      endTime: addMinutes(start, duration).toISOString(),
      timezone: input.timezone,
    });
  },
  async cancel(appointmentId: string, input: CancelAppointmentInput): Promise<AppointmentDetail> {
    await delay();
    if (!input.reason.trim()) throw new Error("Please provide a reason before cancelling this appointment.");
    return replaceAppointment({ ...findAppointment(appointmentId), status: "CANCELLED" });
  },
  async complete(appointmentId: string): Promise<AppointmentDetail> {
    await delay();
    return replaceAppointment({ ...findAppointment(appointmentId), status: "COMPLETED" });
  },
  async noShow(appointmentId: string): Promise<AppointmentDetail> {
    await delay();
    return replaceAppointment({ ...findAppointment(appointmentId), status: "NO_SHOW" });
  },
  async assign(appointmentId: string, input: AssignAppointmentInput): Promise<AppointmentDetail> {
    await delay();
    const appointment = findAppointment(appointmentId);
    return replaceAppointment({
      ...appointment,
      assignedStaffId: input.assignedStaffId,
      assignedStaff: input.assignedStaffId
        ? { id: input.assignedStaffId, role: "MANAGER", user: { id: "usr_assigned", firstName: "Assigned", lastName: "Staff", email: "assigned@example.com" } }
        : null,
    });
  },
};
