import { env } from "@/lib/env";
import { apiRequest } from "@/lib/api-client";
import { mockAppointmentService } from "@/services/mock-appointment-service";
import type {
  AssignAppointmentInput,
  AppointmentAvailabilityResponse,
  AppointmentCalendarQuery,
  AppointmentCalendarResponse,
  AppointmentDetail,
  AppointmentDetailResponse,
  AppointmentListQuery,
  AppointmentListResponse,
  AppointmentStatus,
  CalendarAppointment,
  CancelAppointmentInput,
  CheckAppointmentAvailabilityInput,
  CreateAppointmentInput,
  RescheduleAppointmentInput,
} from "@/types/appointment";

function queryString(query: object) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params.toString();
}

type AppointmentLike = CalendarAppointment | AppointmentDetail;
type ApiAppointmentLike = Omit<AppointmentLike, "status"> & { status: AppointmentStatus | "PENDING_CONFIRMATION" };
type ApiCalendarResponse = Omit<AppointmentCalendarResponse, "appointments"> & { appointments: ApiAppointmentLike[] };
type ApiListResponse = Omit<AppointmentListResponse, "data"> & { data: ApiAppointmentLike[] };
type ApiDetailResponse = Omit<AppointmentDetailResponse, "appointment"> & { appointment: ApiAppointmentLike };

function normalizeStatus(status: AppointmentStatus | "PENDING_CONFIRMATION"): AppointmentStatus {
  return status === "PENDING_CONFIRMATION" ? "PENDING_BUSINESS_CONFIRMATION" : status;
}

function normalizeAppointment<T extends ApiAppointmentLike>(appointment: T): T & { status: AppointmentStatus } {
  return { ...appointment, status: normalizeStatus(appointment.status) };
}

function normalizeCalendarResponse(response: ApiCalendarResponse): AppointmentCalendarResponse {
  return { ...response, appointments: response.appointments.map(normalizeAppointment) };
}

function normalizeListResponse(response: ApiListResponse): AppointmentListResponse {
  return {
    ...response,
    data: response.data.map(normalizeAppointment) as AppointmentDetail[],
  };
}

function normalizeDetailResponse(response: ApiDetailResponse): AppointmentDetailResponse {
  return { ...response, appointment: normalizeAppointment(response.appointment) as AppointmentDetail };
}

export const appointmentService = {
  calendar: (query: AppointmentCalendarQuery) => env.useMockApi
    ? mockAppointmentService.calendar(query)
    : apiRequest<ApiCalendarResponse>(`/business/appointments/calendar?${queryString(query)}`).then(normalizeCalendarResponse),
  list: (query: AppointmentListQuery) => env.useMockApi
    ? mockAppointmentService.list(query)
    : apiRequest<ApiListResponse>(`/business/appointments?${queryString(query)}`).then(normalizeListResponse),
  detail: (appointmentId: string) => env.useMockApi
    ? mockAppointmentService.detail(appointmentId)
    : apiRequest<ApiDetailResponse>(`/business/appointments/${appointmentId}`).then(normalizeDetailResponse),
  checkAvailability: (input: CheckAppointmentAvailabilityInput) => env.useMockApi
    ? mockAppointmentService.checkAvailability(input)
    : apiRequest<AppointmentAvailabilityResponse>("/business/appointments/check-availability", { method: "POST", body: JSON.stringify(input) }),
  create: (input: CreateAppointmentInput) => env.useMockApi
    ? mockAppointmentService.create(input)
    : apiRequest<ApiAppointmentLike>("/business/appointments", { method: "POST", body: JSON.stringify(input) }).then(normalizeAppointment),
  reschedule: (appointmentId: string, input: RescheduleAppointmentInput) => env.useMockApi
    ? mockAppointmentService.reschedule(appointmentId, input)
    : apiRequest<ApiAppointmentLike>(`/business/appointments/${appointmentId}/reschedule`, { method: "PATCH", body: JSON.stringify(input) }).then((appointment) => normalizeAppointment(appointment) as AppointmentDetail),
  cancel: (appointmentId: string, input: CancelAppointmentInput) => env.useMockApi
    ? mockAppointmentService.cancel(appointmentId, input)
    : apiRequest<ApiAppointmentLike>(`/business/appointments/${appointmentId}/cancel`, { method: "PATCH", body: JSON.stringify(input) }).then((appointment) => normalizeAppointment(appointment) as AppointmentDetail),
  complete: (appointmentId: string) => env.useMockApi
    ? mockAppointmentService.complete(appointmentId)
    : apiRequest<ApiAppointmentLike>(`/business/appointments/${appointmentId}/complete`, { method: "PATCH" }).then((appointment) => normalizeAppointment(appointment) as AppointmentDetail),
  noShow: (appointmentId: string) => env.useMockApi
    ? mockAppointmentService.noShow(appointmentId)
    : apiRequest<ApiAppointmentLike>(`/business/appointments/${appointmentId}/no-show`, { method: "PATCH" }).then((appointment) => normalizeAppointment(appointment) as AppointmentDetail),
  assign: (appointmentId: string, input: AssignAppointmentInput) => env.useMockApi
    ? mockAppointmentService.assign(appointmentId, input)
    : apiRequest<ApiAppointmentLike>(`/business/appointments/${appointmentId}/assign`, { method: "PATCH", body: JSON.stringify(input) }).then((appointment) => normalizeAppointment(appointment) as AppointmentDetail),
};
