"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Checkbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { AppButton } from "@/components/app-button";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthStatus } from "@/components/auth/auth-status";
import { useLogin } from "@/hooks/use-auth";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { loginSchema, type LoginValues } from "@/schemas/auth";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const login = useLogin();
  const { register, control, handleSubmit, setError, getValues, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "", rememberMe: false } });
  const onSubmit = handleSubmit(({ email, password }) => login.mutate({ email, password }, {
    onSuccess: (data) => {
      if (nextPath?.startsWith("/invite/") || nextPath === "/onboarding" || data.activeBusiness?.status === "PENDING_SETUP") {
        router.push(nextPath ?? "/onboarding");
        return;
      }
      router.push(!data.subscription || !data.plan ? "/settings/billing" : "/dashboard");
    },
    onError: (error) => applyApiFieldErrors(error, setError),
  }));
  const needsVerification = login.error instanceof ApiError && login.error.code === "EMAIL_NOT_VERIFIED";

  return <div className="w-full space-y-7">
    <AuthHeading eyebrow="Welcome back" title="Sign in to your account" description="Continue to your BizReply AI workspace." />
    {login.isError && <AuthStatus type="error" message={getApiErrorMessage(login.error)} />}
    {needsVerification && <p className="text-sm text-muted-foreground">Your email needs verification. <Link href={`/verify-email?email=${encodeURIComponent(getValues("email"))}`} className="font-semibold text-primary hover:underline">Resend verification email</Link></p>}
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <AppFormField id="email" label="Email address" error={errors.email?.message} required><AppInput id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} /></AppFormField>
      <AppFormField id="password" label="Password" error={errors.password?.message} required><AppInput id="password" type="password" autoComplete="current-password" allowPasswordToggle aria-invalid={!!errors.password} {...register("password")} /></AppFormField>
      <div className="flex items-center justify-between gap-4 text-sm">
        <Controller control={control} name="rememberMe" render={({ field }) => <label className="flex min-h-11 cursor-pointer items-center gap-2 text-muted-foreground">
          <Checkbox.Root checked={field.value} onCheckedChange={(value) => field.onChange(value === true)} className="grid size-5 place-items-center rounded border border-input bg-card text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Checkbox.Indicator><Check className="size-3.5" strokeWidth={3} /></Checkbox.Indicator></Checkbox.Root>
          Remember me
        </label>} />
        <Link href="/forgot-password" className="font-semibold text-primary hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Forgot password?</Link>
      </div>
      <AppButton type="submit" className="w-full" size="lg" loading={login.isPending} loadingText="Signing in">Sign in</AppButton>
    </form>
    <p className="text-center text-sm text-muted-foreground">New to BizReply AI? <Link href="/register" className="font-semibold text-primary hover:underline">Create an account</Link></p>
    <p className="rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">Mock mode: use any valid email and password. Include “error” in the email to test API errors.</p>
  </div>;
}
