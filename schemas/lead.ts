import { z } from "zod";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/leads";

export const leadFormSchema = z.object({
  fullName: z.string().trim().min(1, "Enter the lead's full name").max(160, "Keep the name under 160 characters"),
  phone: z.string().trim().min(5, "Enter a valid phone number").max(40, "Keep the phone number under 40 characters"),
  email: z.union([z.email("Enter a valid email address"), z.literal("")]),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES),
  assignedStaffId: z.string(),
  notes: z.string().max(5000, "Keep notes under 5,000 characters"),
  tagsText: z.string(),
  customFieldsText: z.string().refine((value) => {
    if (!value.trim()) return true;
    try {
      const parsed = JSON.parse(value);
      return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, "Enter a valid JSON object"),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;
