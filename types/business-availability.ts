export const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface BusinessAvailabilityRule {
  id?: string;
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openTime?: string | null;
  closeTime?: string | null;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  appliesToAllServices: boolean;
  isActive?: boolean;
}

export interface BusinessAvailabilityResponse {
  businessId: string;
  timezone: string;
  rules: BusinessAvailabilityRule[];
  summary: {
    openDays: number;
    closedDays: number;
    hasBreakTimes: boolean;
    isComplete: boolean;
  };
}

export interface AvailabilitySummary {
  businessId: string;
  timezone: string;
  openDays: number;
  closedDays: number;
  hasWeeklySchedule: boolean;
  hasCompleteWeeklySchedule: boolean;
  nextOpenDay?: DayOfWeek | null;
  todayStatus?: {
    dayOfWeek: DayOfWeek;
    isOpen: boolean;
    openTime?: string | null;
    closeTime?: string | null;
  };
}

export interface AvailabilityFormRule {
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  hasBreak: boolean;
  breakStartTime: string;
  breakEndTime: string;
  appliesToAllServices: boolean;
}

export interface AvailabilityFormValues {
  timezone: string;
  rules: AvailabilityFormRule[];
}

export interface UpdateBusinessAvailabilityInput {
  timezone: string;
  rules: Array<{
    dayOfWeek: DayOfWeek;
    isOpen: boolean;
    openTime?: string | null;
    closeTime?: string | null;
    breakStartTime?: string | null;
    breakEndTime?: string | null;
    appliesToAllServices: boolean;
  }>;
}
