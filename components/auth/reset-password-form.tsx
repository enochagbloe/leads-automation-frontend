"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { AppButton } from "@/components/app-button";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthStatus } from "@/components/auth/auth-status";
import { useResetPassword } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api-client";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { resetPasswordSchema, type ResetPasswordValues } from "@/schemas/auth";

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const mutation = useResetPassword();
  const { register, handleSubmit, setError, formState: { errors } } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirmPassword: "" } });
  return <div className="w-full space-y-7">
    <AuthHeading eyebrow="Choose a new password" title="Secure your account" description="Create a strong password you haven’t used before." />
    {mutation.isSuccess && <AuthStatus type="success" message={mutation.data.message} />}
    {mutation.isError && <AuthStatus type="error" message={getApiErrorMessage(mutation.error)} />}
    {!token && <AuthStatus type="error" message="This reset link is missing its token. Request a new password reset email." />}
    <form onSubmit={handleSubmit(({ password }) => token && mutation.mutate({ password, token }, { onSuccess: () => router.push("/login"), onError: (error) => applyApiFieldErrors(error, setError) }))} className="space-y-5" noValidate>
      <AppFormField id="password" label="New password" error={errors.password?.message} hint="10–128 characters with uppercase, lowercase, number, and special character." required><AppInput id="password" type="password" autoComplete="new-password" allowPasswordToggle {...register("password")} /></AppFormField>
      <AppFormField id="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message} required><AppInput id="confirmPassword" type="password" autoComplete="new-password" allowPasswordToggle {...register("confirmPassword")} /></AppFormField>
      <AppButton type="submit" className="w-full" size="lg" disabled={!token} loading={mutation.isPending} loadingText="Updating password">Update password</AppButton>
    </form>
    {mutation.isSuccess && <p className="text-center text-sm"><Link href="/login" className="font-semibold text-primary hover:underline">Continue to sign in</Link></p>}
  </div>;
}
