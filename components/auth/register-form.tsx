"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { AppButton } from "@/components/app-button";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthStatus } from "@/components/auth/auth-status";
import { useRegister } from "@/hooks/use-auth";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { registerSchema, type RegisterValues } from "@/schemas/auth";

const industries = ["E-commerce", "Healthcare", "Hospitality", "Professional Services", "Real Estate", "Retail", "Other"];

export function RegisterForm() {
  const router = useRouter();
  const mutation = useRegister();
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { firstName: "", lastName: "", businessName: "", industry: "", email: "", password: "", confirmPassword: "" } });
  const onSubmit = handleSubmit(({ confirmPassword: _, ...values }) => {
    void _;
    mutation.mutate(values, {
      onSuccess: () => router.push(`/verify-email?email=${encodeURIComponent(values.email)}`),
      onError: (error) => {
        if (error instanceof ApiError && error.code === "INVITATION_PENDING") router.push("/accept-invite");
        applyApiFieldErrors(error, setError);
      },
    });
  });

  return <div className="w-full space-y-7">
    <AuthHeading eyebrow="Start your workspace" title="Create your account" description="Set up the secure foundation for your business conversations." />
    {mutation.isError && <AuthStatus type="error" message={getApiErrorMessage(mutation.error)} />}
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <AppFormField id="firstName" label="First name" error={errors.firstName?.message} required><AppInput id="firstName" autoComplete="given-name" {...register("firstName")} /></AppFormField>
        <AppFormField id="lastName" label="Last name" error={errors.lastName?.message} required><AppInput id="lastName" autoComplete="family-name" {...register("lastName")} /></AppFormField>
      </div>
      <AppFormField id="businessName" label="Business name" error={errors.businessName?.message} required><AppInput id="businessName" autoComplete="organization" {...register("businessName")} /></AppFormField>
      <AppFormField id="industry" label="Industry" error={errors.industry?.message} required>
        <Controller
          control={control}
          name="industry"
          render={({ field }) => <AppSelect id="industry" name={field.name} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} options={industries.map((industry) => ({ value: industry, label: industry }))} placeholder="Select your industry" error={Boolean(errors.industry)} required />}
        />
      </AppFormField>
      <AppFormField id="email" label="Email address" error={errors.email?.message} required><AppInput id="email" type="email" autoComplete="email" {...register("email")} /></AppFormField>
      <AppFormField id="password" label="Password" error={errors.password?.message} hint="10–128 characters with uppercase, lowercase, number, and special character." required><AppInput id="password" type="password" autoComplete="new-password" allowPasswordToggle {...register("password")} /></AppFormField>
      <AppFormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message} required><AppInput id="confirmPassword" type="password" autoComplete="new-password" allowPasswordToggle {...register("confirmPassword")} /></AppFormField>
      <div className="flex gap-2 rounded-lg bg-secondary/70 p-3 text-xs leading-5 text-secondary-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />Your workspace starts on the Basic plan. Subscription details can be changed later.</div>
      <AppButton type="submit" className="w-full" size="lg" loading={mutation.isPending} loadingText="Creating account">Create account</AppButton>
    </form>
    <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
  </div>;
}
