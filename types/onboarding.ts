export const WORK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export type WorkDay = (typeof WORK_DAYS)[number];

export interface BusinessOnboardingInput {
  businessName: string;
  industry: string;
  description: string;
  city: string;
  phone: string;
  notificationEmail: string;
  workDays: WorkDay[];
  openingTime: string;
  closingTime: string;
}

export interface BusinessOnboardingResponse {
  message: string;
  businessId: string;
}
