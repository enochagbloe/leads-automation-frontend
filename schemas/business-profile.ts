import { z } from "zod";

const optionalEmail = z.union([z.literal(""), z.email("Enter a valid email address")]);
const optionalUrl = z.union([z.literal(""), z.url("Enter a valid website URL")]);
const optionalPhone = z.union([
  z.literal(""),
  z.string().trim().regex(/^\+?[0-9][0-9\s().-]{5,28}[0-9]$/, "Enter a valid phone number"),
]);

export const businessProfileSchema = z.object({
  name: z.string().trim().min(2, "Business name must be at least 2 characters").max(100, "Keep the name under 100 characters"),
  industry: z.string().trim().min(1, "Select an industry").max(120),
  description: z.string().trim().max(1000, "Keep the description under 1,000 characters"),
  country: z.string().trim().min(2, "Enter a country").max(100),
  city: z.string().trim().min(2, "Enter a city").max(100),
  address: z.string().trim().max(255, "Keep the address under 255 characters"),
  serviceArea: z.string().trim().max(500, "Keep the service area under 500 characters"),
  phone: optionalPhone,
  email: optionalEmail,
  website: optionalUrl,
  timezone: z.string().trim().min(1, "Select a timezone").max(100),
  defaultCurrency: z.string().trim().length(3, "Use a 3-letter currency code").transform((value) => value.toUpperCase()),
  defaultNotificationEmail: optionalEmail,
}).refine((values) => Boolean(values.phone || values.email), {
  message: "Add at least one business phone number or email address",
  path: ["phone"],
});

export type BusinessProfileValues = z.infer<typeof businessProfileSchema>;
