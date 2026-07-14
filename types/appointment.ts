import type { BusinessRole } from "@/types/auth";

export type AppointmentStatus =
  | "PENDING_BUSINESS_CONFIRMATION"
  | "CONFIRMED"
  | "NEEDS_HUMAN_CONFIRMATION"
  | "RESCHEDULE_REQUESTED"
  | "RESCHEDULED"
  | "NEEDS_OUTCOME_CONFIRMATION"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW"
  | "MISSED";

export type AppointmentSource = "MANUAL" | "CONVERSATION" | "AI_ASSISTED" | "AI_CREATED" | "CUSTOMER_REQUESTED";
export type AppointmentLocationType = "BUSINESS_LOCATION" | "CUSTOMER_LOCATION" | "ONLINE" | "PHONE_CALL" | "TO_BE_CONFIRMED";
export type AppointmentLocationStatus = "CONFIRMED" | "NEEDS_CONFIRMATION" | "NOT_REQUIRED";
export type AppointmentView = "day" | "week" | "month";
export type AppointmentConfirmationMode = "MANUAL_CONFIRMATION_REQUIRED" | "AUTO_CONFIRM_WHEN_STAFF_ASSIGNED" | "AUTO_CONFIRM_SAFE_BOOKINGS";
export type AppointmentConfirmationSource = "MANUAL" | "AI_REQUEST" | "AI_PREMIUM_AUTO_CONFIRM" | "SYSTEM";
export type AppointmentAction = "CONFIRM" | "RESCHEDULE" | "CANCEL" | "COMPLETE" | "NO_SHOW" | "MISSED" | "ASSIGN_STAFF" | "CLAIM" | "REVIEW" | "VIEW_DETAILS";
export type AppointmentStatusIndicatorType =
  | "NEED_CONFIRMATION"
  | "COMPLAINT_LINKED"
  | "OUTCOME_REQUIRED"
  | "STARTING_SOON"
  | "IN_PROGRESS"
  | "MISSED"
  | "NO_SHOW"
  | "RESCHEDULED"
  | "COMPLETED"
  | "NORMAL"
  | string;

export interface AppointmentStatusIndicator {
  type: AppointmentStatusIndicatorType;
  label: string;
}

export interface AppointmentPerson {
  id: string;
  fullName?: string;
  phone?: string | null;
  email?: string | null;
}

export interface AppointmentStaff {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  role?: BusinessRole;
  status?: string;
  user?: { id?: string; firstName: string; lastName: string; email?: string };
}

export interface CalendarAppointment {
  id: string;
  title: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  startTime: string;
  endTime: string;
  timezone: string;
  locationType: AppointmentLocationType;
  locationStatus: AppointmentLocationStatus;
  location?: string | null;
  assignedStaffId: string | null;
  leadId: string | null;
  conversationId: string | null;
  serviceId: string | null;
  lead: AppointmentPerson | null;
  service: { id: string; name: string; durationMinutes: number | null } | null;
  assignedStaff: AppointmentStaff | null;
  availableActions?: AppointmentAction[];
  statusIndicator?: AppointmentStatusIndicator | null;
  secondaryStatusIndicators?: AppointmentStatusIndicator[];
  humanConfirmationRequired?: boolean;
  humanConfirmationReason?: string | null;
  rescheduleCount?: number;
  outcomeRequiredAt?: string | null;
  outcomeConfirmedAt?: string | null;
  appointmentConfirmationMode?: AppointmentConfirmationMode;
  autoConfirmed?: boolean;
  confirmationSource?: AppointmentConfirmationSource | null;
  autoConfirmedAt?: string | null;
  autoConfirmDecisionReason?: string | null;
  autoConfirmFailedReason?: string | null;
  autoConfirmConfidence?: number | null;
}

export interface AppointmentDetail extends CalendarAppointment {
  businessId: string;
  businessAccountId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  description: string | null;
  notes: string | null;
  appointmentDate: string;
  humanConfirmationRequired: boolean;
  humanConfirmationReason: string | null;
  cancellationReason: string | null;
  rescheduleReason: string | null;
  completedNote?: string | null;
  noShowReason?: string | null;
  missedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentActivityType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_UPDATED"
  | "APPOINTMENT_RESCHEDULED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_COMPLETED"
  | "APPOINTMENT_NO_SHOW"
  | "APPOINTMENT_MISSED"
  | "APPOINTMENT_ASSIGNED"
  | "APPOINTMENT_STATUS_CHANGED"
  | "APPOINTMENT_AUTO_CONFIRM_EVALUATED"
  | "APPOINTMENT_AUTO_CONFIRMED"
  | "APPOINTMENT_AUTO_CONFIRM_SKIPPED"
  | "APPOINTMENT_PENDING_CONFIRMATION";

export interface AppointmentActivity {
  id: string;
  appointmentId: string;
  businessId: string;
  actorUserId: string | null;
  actorMembershipId: string | null;
  type: AppointmentActivityType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AppointmentDetailResponse {
  appointment: AppointmentDetail;
  activities: AppointmentActivity[];
}

export interface AppointmentCalendarQuery {
  dateFrom: string;
  dateTo: string;
  view: AppointmentView;
  assignedStaffId?: string;
  serviceId?: string;
  status?: AppointmentStatus;
}

export interface AppointmentCalendarResponse {
  view: AppointmentView;
  dateFrom: string;
  dateTo: string;
  appointments: CalendarAppointment[];
}

export interface AppointmentSettings {
  appointmentConfirmationMode: AppointmentConfirmationMode;
  updatedAt?: string;
}

export interface UpdateAppointmentSettingsInput {
  appointmentConfirmationMode: AppointmentConfirmationMode;
}

export interface AppointmentAutoConfirmSettings {
  aiAutoConfirmAppointmentsEnabled: boolean;
  updatedAt?: string;
}

export interface UpdateAppointmentAutoConfirmSettingsInput {
  aiAutoConfirmAppointmentsEnabled: boolean;
}

export interface AppointmentListQuery {
  page: number;
  limit: number;
  view?: "day" | "week" | "month" | "list";
  dateFrom?: string;
  dateTo?: string;
  status?: AppointmentStatus;
  source?: AppointmentSource;
  serviceId?: string;
  assignedStaffId?: string;
  leadId?: string;
  conversationId?: string;
  search?: string;
}

export interface AppointmentListResponse {
  data: AppointmentDetail[];
  summary: { total: number; byStatus: Record<AppointmentStatus, number> };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CheckAppointmentAvailabilityInput {
  serviceId?: string;
  date: string;
  time: string;
  timezone: string;
  assignedStaffId?: string | null;
  durationMinutes?: number;
  excludeAppointmentId?: string;
}

export interface AppointmentAvailabilityResponse {
  available: boolean;
  reason: string | null;
  message?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  warnings?: string[];
  suggestedSlots?: Array<{ date: string; time: string; label?: string }>;
}

export interface CreateAppointmentInput {
  leadId?: string | null;
  conversationId?: string | null;
  serviceId?: string | null;
  assignedStaffId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  title: string;
  description?: string | null;
  notes?: string | null;
  date: string;
  time: string;
  timezone: string;
  durationMinutes?: number;
  locationType: AppointmentLocationType;
  location?: string | null;
  source?: AppointmentSource;
}

export interface RescheduleAppointmentInput {
  date?: string;
  time?: string;
  newDate?: string;
  newStartTime?: string;
  timezone: string;
  reason?: string;
  rescheduleReason?: string;
  notifyCustomer?: boolean;
}

export interface CancelAppointmentInput {
  reason?: string;
  cancellationReason?: string;
  notifyCustomer?: boolean;
}

export interface ConfirmAppointmentInput {
  note?: string | null;
}

export interface CompleteAppointmentInput {
  completedNote?: string | null;
}

export interface NoShowAppointmentInput {
  noShowReason?: string | null;
}

export interface MissedAppointmentInput {
  missedReason?: string | null;
}

export interface AssignAppointmentInput {
  assignedStaffId: string | null;
}

export interface AppointmentAssigneeOption {
  id: string;
  name: string;
  email?: string;
  role?: BusinessRole;
}
