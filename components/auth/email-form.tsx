"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { AppButton } from "@/components/app-button";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthStatus } from "@/components/auth/auth-status";
import { useForgotPassword } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api-client";
import { emailSchema, type EmailValues } from "@/schemas/auth";

export function ForgotPasswordForm() {
  const mutation = useForgotPassword();
  const { register, handleSubmit, formState: { errors } } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });
  return <div className="w-full space-y-7">
    <AuthHeading eyebrow="Account recovery" title="Reset your password" description="Enter your email and we’ll send instructions to securely reset your password." />
    {mutation.isSuccess && <AuthStatus type="success" message={mutation.data.message} />}
    {mutation.isError && <AuthStatus type="error" message={getApiErrorMessage(mutation.error)} />}
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-5" noValidate>
      <AppFormField id="email" label="Email address" error={errors.email?.message} required><AppInput id="email" type="email" autoComplete="email" {...register("email")} /></AppFormField>
      <AppButton type="submit" className="w-full" size="lg" loading={mutation.isPending} loadingText="Sending instructions">Send reset instructions</AppButton>
    </form>
    <p className="text-center text-sm text-muted-foreground"><Link href="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link></p>
  </div>;
}
