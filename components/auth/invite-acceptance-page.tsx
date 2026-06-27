"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, LogOut, Mail, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AppLoader } from "@/components/app-loader";
import { AppLogo } from "@/components/app-logo";
import { AuthStatus } from "@/components/auth/auth-status";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout } from "@/hooks/use-auth";
import { useAcceptInvite, useInviteByToken, useSignupFromInvite } from "@/hooks/use-invites";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { authService } from "@/services/auth-service";
import { cn } from "@/lib/utils";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { inviteSignupSchema, type InviteSignupValues } from "@/schemas/auth";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { InviteDetails } from "@/types/auth";

const inviteErrorMessages: Record<string, string> = {
  INVITE_INVALID_OR_EXPIRED: "This invite link is invalid or has expired. Ask your organization to send a new invite.",
  INVITE_ALREADY_ACCEPTED: "This invite has already been accepted. Please log in to continue.",
  INVITE_CANCELLED: "This invite has been cancelled by the organization.",
  INVITE_EMAIL_MISMATCH: "This invite was sent to a different email address. Please log in with the invited email.",
  USER_ALREADY_EXISTS: "An account already exists for this email. Please log in to accept the invite.",
  INVITED_EMAIL_ALREADY_BUSINESS_OWNER: "This email is already linked to a business owner account. Please use a staff-only email.",
  STAFF_ACCOUNT_CANNOT_CREATE_BUSINESS: "This account was created as a staff account. Staff accounts cannot create businesses.",
};

function roleLabel(role?: InviteDetails["role"]) {
  return role === "MANAGER" ? "Manager" : "Staff";
}

function inviteErrorMessage(error: unknown) {
  if (error instanceof ApiError) return inviteErrorMessages[error.code] ?? error.message;
  return getApiErrorMessage(error);
}

function inviteStatusCopy(invite?: InviteDetails, error?: unknown) {
  if (error) {
    const code = error instanceof ApiError ? error.code : "UNKNOWN";
    return {
      title: code === "INVITE_CANCELLED" ? "Invite cancelled" : code === "INVITE_ALREADY_ACCEPTED" ? "Invite already accepted" : "Invite unavailable",
      description: inviteErrorMessage(error),
    };
  }
  if (invite?.status === "EXPIRED") return { title: "Invite expired", description: "This invite link has expired. Ask your organization to send a new invite." };
  if (invite?.status === "CANCELLED") return { title: "Invite cancelled", description: "This invite has been cancelled by the organization." };
  if (invite?.status === "ACCEPTED") return { title: "Invite already accepted", description: "This invite has already been accepted. Please log in to continue." };
  return null;
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--secondary))_0,transparent_32rem),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))] px-5 py-6 sm:px-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <AppLogo linked={false} />
        <Link href="/login" className="rounded-full border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Sign in
        </Link>
      </header>
      <div className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-5xl items-center justify-center py-10">
        {children}
      </div>
    </main>
  );
}

function InviteSkeleton() {
  return (
    <InviteShell>
      <AppCard className="w-full max-w-xl space-y-5 rounded-3xl border bg-card/90 shadow-[0_24px_80px_rgba(20,35,27,0.10)]">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-11 rounded-xl" />
      </AppCard>
    </InviteShell>
  );
}

function InviteUnavailable({ title, description }: { title: string; description: string }) {
  return (
    <InviteShell>
      <AppCard className="w-full max-w-xl rounded-3xl border bg-card/90 text-center shadow-[0_24px_80px_rgba(20,35,27,0.10)]">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <Clock3 className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        <AppButton asChild className="mt-7">
          <Link href="/login">Go to login</Link>
        </AppButton>
      </AppCard>
    </InviteShell>
  );
}

export function InviteAcceptancePage({ token, autoAccept = false }: { token: string; autoAccept?: boolean }) {
  const router = useRouter();
  const invite = useInviteByToken(token);
  const signup = useSignupFromInvite(token);
  const accept = useAcceptInvite(token);
  const logout = useLogout();
  const [mode, setMode] = useState<"choice" | "signup">("choice");
  const form = useForm<InviteSignupValues>({
    resolver: zodResolver(inviteSignupSchema),
    defaultValues: { name: "", password: "", confirmPassword: "" },
  });

  const currentUser = useQuery({
    queryKey: queryKeys.auth.currentUser,
    queryFn: authService.currentUser,
    retry: false,
  });

  const unavailable = inviteStatusCopy(invite.data, invite.error);
  const inviteEmail = invite.data?.email ?? "";
  const loggedInEmail = currentUser.data?.user.email ?? "";
  const emailMatches = Boolean(loggedInEmail && inviteEmail && loggedInEmail.toLowerCase() === inviteEmail.toLowerCase());
  const emailMismatch = Boolean(currentUser.data && inviteEmail && !emailMatches);
  const loginHref = useMemo(() => `/login?inviteToken=${encodeURIComponent(token)}`, [token]);

  const redirectToWorkspace = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  useEffect(() => {
    if (!autoAccept || !invite.data || invite.data.status !== "PENDING" || !currentUser.data || !emailMatches || accept.isPending || accept.isSuccess) return;
    accept.mutate(undefined, { onSuccess: redirectToWorkspace });
  }, [accept, autoAccept, currentUser.data, emailMatches, invite.data, redirectToWorkspace]);

  if (invite.isPending) return <InviteSkeleton />;
  if (unavailable) return <InviteUnavailable title={unavailable.title} description={unavailable.description} />;

  const onSignup = form.handleSubmit((values) => {
    signup.mutate({ name: values.name, password: values.password }, {
      onSuccess: redirectToWorkspace,
      onError: (error) => applyApiFieldErrors(error, form.setError),
    });
  });

  return (
    <InviteShell>
      <AppCard className="w-full max-w-xl rounded-3xl border bg-card/90 p-5 shadow-[0_24px_80px_rgba(20,35,27,0.10)] backdrop-blur sm:p-7">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <BriefcaseBusiness className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Business invitation</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Join {invite.data?.business.name}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              You’ve been invited to join {invite.data?.business.name} as {roleLabel(invite.data?.role)}.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-background/70 p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"><Mail className="size-4" /> Invited email</p>
            <p className="mt-2 truncate text-sm font-bold">{inviteEmail}</p>
          </div>
          <div className="rounded-2xl border bg-background/70 p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"><ShieldCheck className="size-4" /> Role</p>
            <span className="mt-2 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-black text-primary">{roleLabel(invite.data?.role)}</span>
          </div>
        </div>

        {accept.isSuccess || signup.isSuccess ? (
          <div className="mt-6 rounded-2xl border border-success/25 bg-success/10 p-4 text-success">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-bold">You’ve joined {invite.data?.business.name}.</p>
                <p className="mt-1 text-sm">Taking you to your workspace...</p>
              </div>
            </div>
          </div>
        ) : null}

        {emailMismatch && (
          <div className="mt-6 space-y-3">
            <AuthStatus type="error" message="This invite was sent to a different email address. Please log in with the invited email." />
            <AppButton
              variant="outline"
              className="w-full"
              loading={logout.isPending}
              loadingText="Signing out"
              onClick={() => logout.mutate(undefined, { onSettled: () => router.push(loginHref) })}
            >
              <LogOut className="size-4" /> Switch account / Log out
            </AppButton>
          </div>
        )}

        {(accept.isError || signup.isError) && <div className="mt-6"><AuthStatus type="error" message={inviteErrorMessage(accept.error ?? signup.error)} /></div>}

        {!emailMismatch && mode === "choice" && (
          <div className="mt-7 space-y-3">
            {currentUser.data ? (
              <AppButton className="w-full" size="lg" loading={accept.isPending} loadingText="Accepting invite" onClick={() => accept.mutate(undefined, { onSuccess: redirectToWorkspace })}>
                Accept invite <ArrowRight className="size-4" />
              </AppButton>
            ) : (
              <>
                <AppButton className="w-full" size="lg" onClick={() => setMode("signup")}>
                  <UserPlus className="size-4" /> Create account
                </AppButton>
                <AppButton asChild variant="outline" className="w-full" size="lg">
                  <Link href={loginHref}>Log in to accept invite</Link>
                </AppButton>
              </>
            )}
          </div>
        )}

        {!emailMismatch && mode === "signup" && (
          <form className="mt-7 space-y-5" onSubmit={onSignup} noValidate>
            <div className="rounded-2xl border bg-muted/35 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Account email</p>
              <p className="mt-1 text-sm font-semibold">{inviteEmail}</p>
              <p className="mt-1 text-xs text-muted-foreground">This email comes from the invite and cannot be changed.</p>
            </div>
            <AppFormField id="name" label="Full name" error={form.formState.errors.name?.message} required>
              <AppInput id="name" autoComplete="name" placeholder="Kwame Mensah" aria-invalid={!!form.formState.errors.name} {...form.register("name")} />
            </AppFormField>
            <AppFormField id="password" label="Password" error={form.formState.errors.password?.message} required>
              <AppInput id="password" type="password" autoComplete="new-password" allowPasswordToggle aria-invalid={!!form.formState.errors.password} {...form.register("password")} />
            </AppFormField>
            <AppFormField id="confirmPassword" label="Confirm password" error={form.formState.errors.confirmPassword?.message} required>
              <AppInput id="confirmPassword" type="password" autoComplete="new-password" allowPasswordToggle aria-invalid={!!form.formState.errors.confirmPassword} {...form.register("confirmPassword")} />
            </AppFormField>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <AppButton type="button" variant="ghost" onClick={() => setMode("choice")}>Back</AppButton>
              <AppButton type="submit" loading={signup.isPending} loadingText="Creating account">Create staff account</AppButton>
            </div>
          </form>
        )}

        {autoAccept && accept.isPending && (
          <div className={cn("mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground")}>
            <AppLoader label="Accepting your invite..." />
          </div>
        )}
      </AppCard>
    </InviteShell>
  );
}
