import { env } from "@/lib/env";
import { businessStore } from "@/lib/business-store";
import { businessAvailabilityService } from "@/services/business-availability-service";
import { businessProfileService } from "@/services/business-profile-service";
import { DAYS_OF_WEEK, type DayOfWeek, type UpdateBusinessAvailabilityInput } from "@/types/business-availability";
import type { UpdateBusinessProfileInput } from "@/types/business-profile";
import type { BusinessOnboardingInput, BusinessOnboardingResponse } from "@/types/onboarding";
import type { WorkDay } from "@/types/onboarding";

const GHANA_DEFAULTS = {
  country: "Ghana",
  timezone: "Africa/Accra",
  defaultCurrency: "GHS",
} as const;

const WORK_DAY_TO_BACKEND_DAY: Record<WorkDay, DayOfWeek> = {
  Monday: "MONDAY",
  Tuesday: "TUESDAY",
  Wednesday: "WEDNESDAY",
  Thursday: "THURSDAY",
  Friday: "FRIDAY",
  Saturday: "SATURDAY",
  Sunday: "SUNDAY",
};

function buildProfilePayload(input: BusinessOnboardingInput): UpdateBusinessProfileInput {
  return {
    name: input.businessName,
    industry: input.industry,
    description: input.description,
    city: input.city,
    phone: input.phone,
    defaultNotificationEmail: input.notificationEmail,
    ...GHANA_DEFAULTS,
  };
}

function buildAvailabilityPayload(input: BusinessOnboardingInput): UpdateBusinessAvailabilityInput {
  const selectedDays = new Set(input.workDays.map((day) => WORK_DAY_TO_BACKEND_DAY[day]));
  return {
    timezone: GHANA_DEFAULTS.timezone,
    rules: DAYS_OF_WEEK.map((dayOfWeek) => {
      const isOpen = selectedDays.has(dayOfWeek);
      return {
        dayOfWeek,
        isOpen,
        openTime: isOpen ? input.openingTime : null,
        closeTime: isOpen ? input.closingTime : null,
        breakStartTime: null,
        breakEndTime: null,
        appliesToAllServices: true,
      };
    }),
  };
}

export const onboardingService = {
  buildProfilePayload,
  buildAvailabilityPayload,
  async configureProfile(input: BusinessOnboardingInput) {
    if (env.useMockApi) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return buildProfilePayload(input);
    }
    return businessProfileService.update(buildProfilePayload(input));
  },
  async configureAvailability(input: BusinessOnboardingInput) {
    if (env.useMockApi) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return buildAvailabilityPayload(input);
    }
    return businessAvailabilityService.update(buildAvailabilityPayload(input));
  },
  completeResult(): BusinessOnboardingResponse {
    return { message: "Business workspace configured", businessId: businessStore.get() ?? "" };
  },
  async complete(input: BusinessOnboardingInput): Promise<BusinessOnboardingResponse> {
    if (env.useMockApi) {
      await new Promise((resolve) => setTimeout(resolve, 2_200));
      return { message: "Business workspace configured", businessId: businessStore.get() ?? "biz_demo" };
    }
    await this.configureProfile(input);
    await this.configureAvailability(input);
    return this.completeResult();
  },
};
