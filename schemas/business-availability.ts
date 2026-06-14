import { z } from "zod";
import { DAYS_OF_WEEK } from "@/types/business-availability";

const time = z.union([z.literal(""), z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format")]);

export const businessAvailabilitySchema = z.object({
  timezone: z.string().trim().min(1, "Select a timezone").max(100),
  rules: z.array(z.object({
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    isOpen: z.boolean(),
    openTime: time,
    closeTime: time,
    hasBreak: z.boolean(),
    breakStartTime: time,
    breakEndTime: time,
    appliesToAllServices: z.boolean(),
  })).length(7, "A rule is required for every day"),
}).superRefine((values, context) => {
  if (new Set(values.rules.map((rule) => rule.dayOfWeek)).size !== 7) {
    context.addIssue({ code: "custom", path: ["rules"], message: "A unique rule is required for every day" });
  }
  values.rules.forEach((rule, index) => {
    if (!rule.isOpen) return;
    if (!rule.openTime) context.addIssue({ code: "custom", path: ["rules", index, "openTime"], message: "Opening time is required" });
    if (!rule.closeTime) context.addIssue({ code: "custom", path: ["rules", index, "closeTime"], message: "Closing time is required" });
    if (rule.openTime && rule.closeTime && rule.openTime >= rule.closeTime) {
      context.addIssue({ code: "custom", path: ["rules", index, "closeTime"], message: "Closing time must be after opening time" });
    }
    if (!rule.hasBreak) return;
    if (!rule.breakStartTime) context.addIssue({ code: "custom", path: ["rules", index, "breakStartTime"], message: "Break start is required" });
    if (!rule.breakEndTime) context.addIssue({ code: "custom", path: ["rules", index, "breakEndTime"], message: "Break end is required" });
    if (rule.breakStartTime && rule.openTime && rule.breakStartTime <= rule.openTime) {
      context.addIssue({ code: "custom", path: ["rules", index, "breakStartTime"], message: "Break must start after opening" });
    }
    if (rule.breakStartTime && rule.breakEndTime && rule.breakStartTime >= rule.breakEndTime) {
      context.addIssue({ code: "custom", path: ["rules", index, "breakEndTime"], message: "Break end must be after break start" });
    }
    if (rule.breakEndTime && rule.closeTime && rule.breakEndTime >= rule.closeTime) {
      context.addIssue({ code: "custom", path: ["rules", index, "breakEndTime"], message: "Break must end before closing" });
    }
  });
});
