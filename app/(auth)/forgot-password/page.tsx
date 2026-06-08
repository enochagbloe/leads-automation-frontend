import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/email-form";
export const metadata: Metadata = { title: "Forgot password" };
export default function ForgotPasswordPage() { return <ForgotPasswordForm />; }
