"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Clock3, Mail, ShieldCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { AppEmptyState } from "@/components/app-empty-state";
import { AppErrorState } from "@/components/app-error-state";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { PlanBadge } from "@/components/subscription/plan-badge";
import { UsageMeter } from "@/components/subscription/usage-meter";
import { useCurrentUser } from "@/hooks/use-auth";
import { useInviteMember } from "@/hooks/use-businesses";
import { useCurrentSubscription } from "@/hooks/use-subscription";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import type { BusinessInvitation } from "@/types/auth";

const schema = z.object({ email: z.email("Enter a valid email"), role: z.enum(["MANAGER", "STAFF"]) });
type Values = z.infer<typeof schema>;
type VisibleInvitation = BusinessInvitation & { sentAt: string };

function invitationStorageKey(businessId?: string) {
  return businessId ? `bizreply_invitations_${businessId}` : null;
}

function readStoredInvitations(businessId?: string): VisibleInvitation[] {
  const key = invitationStorageKey(businessId);
  if (!key || typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as VisibleInvitation[];
  } catch {
    return [];
  }
}

function persistInvitations(businessId: string | undefined, invitations: VisibleInvitation[]) {
  const key = invitationStorageKey(businessId);
  if (key && typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(invitations));
}

export function InviteMemberForm() {
  const profile = useCurrentUser();
  const subscription = useCurrentSubscription();
  const invite = useInviteMember();
  const [invitations, setInvitations] = useState<VisibleInvitation[]>(() => readStoredInvitations(profile.data?.activeBusiness?.id));
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", role: "STAFF" } });

  if (profile.data && !profile.data.permissions.includes("members:manage")) return <AppErrorState title="Permission denied" description="Only business owners can invite team members." />;

  const handleSubmit = form.handleSubmit((values) => invite.mutate(values, {
    onSuccess: ({ invitation }) => {
      const nextInvitation = { ...invitation, sentAt: new Date().toISOString() };
      setInvitations((current) => {
        const next = [nextInvitation, ...current.filter((item) => item.id !== invitation.id && item.email !== invitation.email)];
        persistInvitations(profile.data?.activeBusiness?.id, next);
        return next;
      });
      toast.success("Invitation sent");
      form.reset();
    },
    onError: (error) => applyApiFieldErrors(error, form.setError),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl p-5 sm:p-8 lg:p-10">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Workspace settings</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Invite team members</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Invite managers and staff into the selected business workspace.</p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <AppCard className="overflow-hidden p-0 sm:p-0">
          <section className="p-5 sm:p-6" aria-labelledby="invite-member-heading">
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <UserPlus className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="invite-member-heading" className="font-bold">Invite a team member</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">We will email them a secure link to join this business.</p>
              </div>
            </div>

            <form className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_150px_auto] md:items-start" onSubmit={handleSubmit}>
              <AppFormField id="email" label="Email address" error={form.formState.errors.email?.message} required>
                <AppInput id="email" type="email" placeholder="name@company.com" autoComplete="email" {...form.register("email")} />
              </AppFormField>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <AppFormField id="role" label="Role" error={form.formState.errors.role?.message} required>
                    <AppSelect
                      id="role"
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      options={[
                        { value: "STAFF", label: "Staff", description: "Standard workspace access" },
                        { value: "MANAGER", label: "Manager", description: "Manage staff and workspace settings" },
                      ]}
                      error={Boolean(form.formState.errors.role)}
                      required
                    />
                  </AppFormField>
                )}
              />
              <AppButton className="w-full md:mt-[26px] md:w-auto" type="submit" loading={invite.isPending} loadingText="Sending">
                Send invitation
              </AppButton>
            </form>
          </section>

          <section className="border-t" aria-labelledby="invitations-heading">
            <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-5 sm:px-6">
              <div>
                <h2 id="invitations-heading" className="font-bold">Invitations</h2>
                <p className="mt-1 text-sm text-muted-foreground">People invited to join this workspace.</p>
              </div>
              {invitations.length > 0 && <span className="text-xs font-semibold text-muted-foreground">{invitations.length} sent</span>}
            </div>

            {invitations.length === 0 ? (
              <AppEmptyState
                className="m-5 min-h-52 border-0 bg-muted/45 sm:m-6"
                icon={Mail}
                title="No invitations sent yet"
                description="New invitations will appear here with their current status."
              />
            ) : (
              <ul className="divide-y" aria-label="Sent invitations">
                {invitations.map((invitation) => {
                  const accepted = invitation.status === "ACCEPTED";
                  const initials = invitation.email.slice(0, 2).toUpperCase();
                  return (
                    <li key={invitation.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/35 sm:flex-row sm:items-center sm:px-6">
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold ring-1 ring-border", accepted ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground")} aria-hidden="true">
                        {initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{invitation.email}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {invitation.role === "MANAGER" ? "Manager" : "Staff"} · Sent {new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(new Date(invitation.sentAt))}
                        </p>
                      </div>
                      <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", accepted ? "bg-secondary text-success" : "bg-warning/10 text-warning")}>
                        {accepted ? <Check className="size-3.5" aria-hidden="true" /> : <Clock3 className="size-3.5" aria-hidden="true" />}
                        {accepted ? "Invite accepted" : "Invited"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </AppCard>

        {subscription.data && (
          <AppCard className="lg:sticky lg:top-24">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Users className="size-5" aria-hidden="true" />
              </span>
              <PlanBadge plan={subscription.data.plan.code} />
            </div>
            <h2 className="mt-5 font-bold">Staff allowance</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">Seats shared across the {subscription.data.account.name} workspace.</p>
            <UsageMeter className="mt-5" label="Staff seats used" value={subscription.data.accountUsage.staff} limit={subscription.data.plan.limits.staff} />
            <div className="mt-5 flex items-center gap-2 border-t pt-4 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
              Plan limits are enforced across the workspace account.
            </div>
            <Link href="/settings/billing" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Manage plan
            </Link>
          </AppCard>
        )}
      </div>
    </main>
  );
}
