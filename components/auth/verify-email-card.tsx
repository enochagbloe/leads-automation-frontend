"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/app-button";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthStatus } from "@/components/auth/auth-status";
import { useResendVerification, useVerifyEmail } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api-client";

export function VerifyEmailCard({ email, token }: { email?: string; token?: string }) {
  const router = useRouter();
  const resend = useResendVerification();
  const verify = useVerifyEmail();
  return <div className="w-full space-y-7">
    <span className="grid size-14 place-items-center rounded-xl bg-secondary text-secondary-foreground"><MailCheck className="size-6" /></span>
    <AuthHeading eyebrow="One last step" title={token ? "Verify your email" : "Check your inbox"} description={token ? "Confirm your email address to activate your BizReply AI account." : `We sent a verification link${email ? ` to ${email}` : ""}. Open it to activate your account.`} />
    {resend.isSuccess && <AuthStatus type="success" message={resend.data.message} />}
    {resend.isError && <AuthStatus type="error" message={getApiErrorMessage(resend.error)} />}
    {verify.isSuccess && <AuthStatus type="success" message={verify.data.message} />}
    {verify.isError && <AuthStatus type="error" message={getApiErrorMessage(verify.error)} />}
    <div className="space-y-3">
      {token && <AppButton className="w-full" size="lg" loading={verify.isPending} loadingText="Verifying email" onClick={() => verify.mutate({ token }, { onSuccess: () => router.push("/login?next=/onboarding") })}>Verify email</AppButton>}
      {email && <AppButton className="w-full" variant={token ? "outline" : "default"} size="lg" loading={resend.isPending} loadingText="Sending email" onClick={() => resend.mutate({ email })}>Resend verification email</AppButton>}
    </div>
    <p className="text-sm leading-6 text-muted-foreground">Didn’t receive it? Check your spam folder or confirm the email address you used.</p>
    <p className="text-center text-sm"><Link href="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link></p>
  </div>;
}
