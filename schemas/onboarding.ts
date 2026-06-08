import { z } from "zod";
import { WORK_DAYS } from "@/types/onboarding";

export const onboardingSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name").max(100, "Keep the name under 100 characters"),
  industry: z.string().min(1, "Select your industry"),
  description: z.string().trim().min(15, "Tell us a little more about your business").max(500, "Keep the description under 500 characters"),
  city: z.string().trim().min(2, "Enter your city").max(100, "Keep the city under 100 characters"),
  phone: z.string().trim().min(7, "Enter a valid business phone number").max(20, "Enter a valid business phone number").regex(/^[+()\d\s-]+$/, "Enter a valid business phone number"),
  notificationEmail: z.email("Enter a valid notification email"),
  workDays: z.array(z.enum(WORK_DAYS)).min(1, "Select at least one working day"),
  openingTime: z.string().min(1, "Choose an opening time"),
  closingTime: z.string().min(1, "Choose a closing time"),
}).refine((data) => data.openingTime < data.closingTime, { message: "Closing time must be after opening time", path: ["closingTime"] });

export type OnboardingValues = z.infer<typeof onboardingSchema>;
