import { z } from "zod";

const email = z.email("Enter a valid email address");
const password = z.string().min(10, "Use at least 10 characters").max(128, "Use no more than 128 characters").regex(/[A-Z]/, "Include an uppercase letter").regex(/[a-z]/, "Include a lowercase letter").regex(/[0-9]/, "Include a number").regex(/[^A-Za-z0-9]/, "Include a special character");

export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password"), rememberMe: z.boolean().optional() });
export const registerSchema = z.object({
  firstName: z.string().min(2, "Enter your first name"),
  lastName: z.string().min(2, "Enter your last name"),
  businessName: z.string().min(2, "Enter your business name"),
  industry: z.string().min(1, "Select your industry"),
  email,
  password,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
export const emailSchema = z.object({ email });
export const resetPasswordSchema = z.object({ password, confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type EmailValues = z.infer<typeof emailSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
