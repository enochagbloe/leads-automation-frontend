import { z } from "zod";

export const businessServiceSchema = z.object({
  name: z.string().trim().min(2, "Service name must be at least 2 characters").max(100),
  category: z.string().trim().max(80),
  description: z.string().trim().max(1000),
  priceType: z.enum(["FIXED", "STARTING_FROM", "RANGE", "QUOTE_ONLY", "FREE", "NOT_SET"]),
  basePrice: z.union([z.literal(""), z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid non-negative price")]),
  currency: z.string().trim().length(3, "Use a 3-letter currency code"),
  priceDescription: z.string().trim().max(500),
  durationMinutes: z.union([z.literal(""), z.literal("__unset"), z.string().regex(/^\d+$/, "Enter duration in minutes")]),
  bufferMinutes: z.string().regex(/^\d+$/, "Enter buffer time in minutes"),
  requiresPayment: z.boolean(),
  paymentRequiredBeforeBooking: z.boolean(),
  isBookable: z.boolean(),
  isActive: z.boolean(),
  autoConfirmEligible: z.boolean(),
  requiresManualApproval: z.boolean(),
  requiresDepositBeforeConfirmation: z.boolean(),
  requiresLocationBeforeConfirmation: z.boolean(),
  requiresStaffAssignment: z.boolean(),
}).refine((values) => !values.paymentRequiredBeforeBooking || values.requiresPayment, {
  message: "Enable requires payment first",
  path: ["paymentRequiredBeforeBooking"],
});

export type BusinessServiceValues = z.infer<typeof businessServiceSchema>;
