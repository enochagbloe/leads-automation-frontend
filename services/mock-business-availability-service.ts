import { DAYS_OF_WEEK, type AvailabilitySummary, type BusinessAvailabilityResponse, type BusinessAvailabilityRule, type UpdateBusinessAvailabilityInput } from "@/types/business-availability";

let timezone = "Africa/Accra";
let rules: BusinessAvailabilityRule[] = DAYS_OF_WEEK.map((dayOfWeek, index) => ({
  id: `availability_${dayOfWeek.toLowerCase()}`,
  dayOfWeek,
  isOpen: index < 6,
  openTime: index < 5 ? "08:00" : index === 5 ? "09:00" : null,
  closeTime: index < 5 ? "17:00" : index === 5 ? "15:00" : null,
  breakStartTime: index < 5 ? "12:00" : null,
  breakEndTime: index < 5 ? "13:00" : null,
  appliesToAllServices: true,
  isActive: true,
}));

const delay = (ms = 280) => new Promise((resolve) => setTimeout(resolve, ms));

function summary(): AvailabilitySummary {
  const openDays = rules.filter((rule) => rule.isOpen).length;
  const todayIndex = (new Date().getDay() + 6) % 7;
  const today = rules[todayIndex];
  const nextOpenDay = [...rules.slice(todayIndex), ...rules.slice(0, todayIndex)].find((rule) => rule.isOpen)?.dayOfWeek ?? null;
  return {
    businessId: "biz_demo",
    timezone,
    openDays,
    closedDays: 7 - openDays,
    hasWeeklySchedule: rules.length === 7,
    hasCompleteWeeklySchedule: rules.length === 7 && openDays > 0,
    nextOpenDay,
    todayStatus: today ? { dayOfWeek: today.dayOfWeek, isOpen: today.isOpen, openTime: today.openTime, closeTime: today.closeTime } : undefined,
  };
}

function response(): BusinessAvailabilityResponse {
  const current = summary();
  return {
    businessId: "biz_demo",
    timezone,
    rules,
    summary: {
      openDays: current.openDays,
      closedDays: current.closedDays,
      hasBreakTimes: rules.some((rule) => Boolean(rule.breakStartTime && rule.breakEndTime)),
      isComplete: current.hasCompleteWeeklySchedule,
    },
  };
}

export const mockBusinessAvailabilityService = {
  async get() { await delay(); return response(); },
  async summary() { await delay(180); return summary(); },
  async update(input: UpdateBusinessAvailabilityInput) {
    await delay(450);
    timezone = input.timezone;
    rules = input.rules.map((rule) => ({ ...rule, id: `availability_${rule.dayOfWeek.toLowerCase()}`, isActive: true }));
    return response();
  },
};
