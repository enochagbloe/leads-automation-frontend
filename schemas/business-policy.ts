import { z } from "zod";
import { BUSINESS_POLICY_CATEGORIES } from "@/types/business-policy";

export const businessPolicySchema = z.object({
  title: z.string().trim().min(2, "Policy title must be at least 2 characters").max(120),
  category: z.enum(BUSINESS_POLICY_CATEGORIES),
  visibility: z.enum(["INTERNAL_ONLY", "CUSTOMER_FACING"]),
  shortSummary: z.string().trim().max(300, "Summary must be 300 characters or less"),
  content: z.string().trim().min(10, "Policy content must be at least 10 characters").max(3000),
  priority: z.string().regex(/^\d+$/, "Priority must be a whole number").refine((value) => Number(value) <= 100000, "Priority cannot exceed 100000"),
  isActive: z.boolean(),
});

export type BusinessPolicyValues = z.infer<typeof businessPolicySchema>;
