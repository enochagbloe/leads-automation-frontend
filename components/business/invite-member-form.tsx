"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Clock3, HelpCircle, Mail, MoreHorizontal, ShieldCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { systemNotify } from "@/lib/system-notifications";
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
import { useBusinessMembers } from "@/hooks/use-business-members";
import { useInviteMember } from "@/hooks/use-businesses";
import { useCurrentSubscription } from "@/hooks/use-subscription";
import { applyApiFieldErrors } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import type { BusinessInvitation, BusinessMemberOption, BusinessRole, MembershipStatus } from "@/types/auth";

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

function formatTeamDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || email;
}

function initials(name: string, email?: string) {
  const source = name.trim() || email || "?";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  return source.slice(0, 1).toUpperCase();
}

function roleLabel(role: BusinessRole) {
  if (role === "BUSINESS_OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  return "Member";
}

function statusLabel(status: MembershipStatus | string) {
  if (status === "ACTIVE") return "Active";
  if (status === "INVITED") return "Invited";
  if (status === "REMOVED") return "Removed";
  if (status === "SUSPENDED_BY_PLAN") return "Suspended";
  return "Disabled";
}

function TeamCheckbox({ disabled }: { disabled?: boolean }) {
  return (
    <Checkbox.Root
      disabled={disabled}
      className="grid size-6 shrink-0 place-items-center rounded-lg border border-[#d7d7d7] bg-white text-[#5d21ff] outline-none transition-colors hover:border-[#bdbdbd] focus-visible:ring-2 focus-visible:ring-[#5d21ff]/25 disabled:opacity-45"
      aria-label="Select person"
    >
      <Checkbox.Indicator><Check className="size-3.5" strokeWidth={3} /></Checkbox.Indicator>
    </Checkbox.Root>
  );
}

function TeamAvatar({ name, email, removed, invited }: { name: string; email?: string; removed?: boolean; invited?: boolean }) {
  const letter = initials(name, email);
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium",
        invited && "border border-dashed border-[#b7b7b7] bg-white text-[#5b5b5b]",
        !invited && !removed && "border border-[#dec9ff] bg-[#efe4ff] text-[#7b36ff]",
        removed && "border border-[#dcdcdc] bg-[#f3f3f3] text-[#a0a0a0]",
      )}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

function InlineMenu({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={disabled} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-0 text-left text-base font-semibold text-[#171717] outline-none transition-colors hover:text-[#5d21ff] focus-visible:ring-2 focus-visible:ring-[#5d21ff]/20 disabled:cursor-not-allowed disabled:text-[#a8a8a8]">
        {label}
        <ChevronDown className="size-4 text-[#777]" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="account-menu-content z-[80] min-w-44 rounded-xl border bg-popover p-1.5 shadow-[0_14px_40px_rgba(20,35,27,0.14)] outline-none">
          <DropdownMenu.Item className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold outline-none data-[highlighted]:bg-muted">View details</DropdownMenu.Item>
          <DropdownMenu.Item className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold outline-none data-[highlighted]:bg-muted">Copy email</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MoreMenu({ disabled }: { disabled?: boolean }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={disabled} className="grid size-8 cursor-pointer place-items-center rounded-md text-[#707070] outline-none transition-colors hover:bg-[#f5f5f5] hover:text-[#171717] focus-visible:ring-2 focus-visible:ring-[#5d21ff]/20 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Open row actions">
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="account-menu-content z-[80] min-w-44 rounded-xl border bg-popover p-1.5 shadow-[0_14px_40px_rgba(20,35,27,0.14)] outline-none">
          <DropdownMenu.Item className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold outline-none data-[highlighted]:bg-muted">Copy email</DropdownMenu.Item>
          <DropdownMenu.Item className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold outline-none data-[highlighted]:bg-muted">Manage access</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type TeamDirectoryRow =
  | {
      id: string;
      group: "invited";
      name: string;
      date: string;
      email: string;
      role: string;
      status: string;
      currentUser?: boolean;
    }
  | {
      id: string;
      group: "member";
      name: string;
      date: string;
      email: string;
      role: string;
      status: string;
      currentUser?: boolean;
    };

function TeamDirectoryRowView({ row }: { row: TeamDirectoryRow }) {
  const removed = row.status === "Removed";
  return (
    <div className={cn("grid min-h-14 grid-cols-[2.4rem_260px_180px_240px_170px_130px_40px] items-center border-t border-[#eeeeee] text-base", removed && "text-[#a8a8a8]")}>
      <TeamCheckbox disabled={removed} />
      <div className="flex min-w-0 items-center gap-3">
        <TeamAvatar name={row.name} email={row.email} invited={row.group === "invited"} removed={removed} />
        <span className={cn("truncate font-semibold text-[#171717]", removed && "text-[#a8a8a8] line-through")}>
          {row.name}{row.currentUser ? <span className="ml-1 font-normal text-[#777] no-underline">(You)</span> : null}
        </span>
      </div>
      <span className={cn("text-[#6f6f6f]", removed && "text-[#bebebe]")}>{row.date}</span>
      <a href={`mailto:${row.email}`} className={cn("truncate font-medium text-[#4b16ff] transition-colors hover:text-[#2f0ca8] hover:underline", removed && "text-[#cbbcff]")}>{row.email}</a>
      <InlineMenu label={row.role} disabled={removed} />
      <InlineMenu label={row.group === "invited" ? "Actions" : row.status} disabled={removed && row.group !== "member"} />
      <MoreMenu disabled={false} />
    </div>
  );
}

function TeamDirectory({ invitations, members, currentMembershipId, loading }: { invitations: VisibleInvitation[]; members: BusinessMemberOption[]; currentMembershipId?: string; loading: boolean }) {
  const invitedRows: TeamDirectoryRow[] = invitations.map((invitation) => ({
    id: `invited-${invitation.id}`,
    group: "invited",
    name: nameFromEmail(invitation.email),
    date: formatTeamDate(invitation.sentAt),
    email: invitation.email,
    role: invitation.role === "MANAGER" ? "Manager" : "Member",
    status: invitation.status === "ACCEPTED" ? "Accepted" : "Pending",
  }));

  const memberRows: TeamDirectoryRow[] = members.map((member) => {
    const name = [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") || member.user.email || "Team member";
    return {
      id: `member-${member.membershipId || member.id}`,
      group: "member",
      name,
      date: formatTeamDate(null),
      email: member.user.email ?? "No email",
      role: roleLabel(member.role),
      status: statusLabel(member.status),
      currentUser: currentMembershipId === (member.membershipId || member.id),
    };
  });

  const renderHeader = (label: string, columns: { date: string; access: string; status: string }, empty?: boolean) => (
    <div className={cn("grid min-h-14 grid-cols-[2.4rem_260px_180px_240px_170px_130px_40px] items-center text-base", empty && "border-t border-[#eeeeee]")}>
      <TeamCheckbox disabled />
      <div className="flex items-center gap-2 font-semibold text-[#171717]">
        <span>{label}</span>
        <HelpCircle className="size-4 fill-[#cfcfcf] text-white" aria-hidden="true" />
      </div>
      <span className="font-medium text-[#737373]">{columns.date}</span>
      <span className="font-medium text-[#737373]">Email</span>
      <span className="font-medium text-[#737373]">{columns.access}</span>
      <span className="font-medium text-[#737373]">{columns.status}</span>
      <span />
    </div>
  );

  return (
    <section className="mt-10 overflow-hidden px-5 py-3">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1 pt-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">People access</p>
          <h2 id="team-directory-heading" className="mt-1 text-xl font-bold tracking-tight">Team directory</h2>
        </div>
        <p className="text-sm text-muted-foreground">{invitations.length + members.length} people shown</p>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[1060px]">
          {renderHeader("Invited", { date: "Invited at", access: "Type", status: "Invitation" })}
          {invitedRows.length ? invitedRows.map((row) => <TeamDirectoryRowView key={row.id} row={row} />) : (
            <div className="grid min-h-14 grid-cols-[2.4rem_260px_1fr] items-center border-t border-[#eeeeee] text-base text-[#8b8b8b]">
              <span />
              <span className="font-medium">No pending invitations</span>
              <span>New invitations appear here after they are sent.</span>
            </div>
          )}
          <div className="h-11" />
          {renderHeader("Member", { date: "Created at", access: "Role", status: "Status" }, true)}
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="grid min-h-14 grid-cols-[2.4rem_260px_180px_240px_170px_130px_40px] items-center border-t border-[#eeeeee]">
                <div className="size-6 rounded-lg bg-[#f0f0f0]" />
                <div className="h-4 w-40 rounded bg-[#f0f0f0]" />
                <div className="h-4 w-24 rounded bg-[#f0f0f0]" />
                <div className="h-4 w-44 rounded bg-[#f0f0f0]" />
                <div className="h-4 w-20 rounded bg-[#f0f0f0]" />
                <div className="h-4 w-20 rounded bg-[#f0f0f0]" />
                <div className="h-4 w-7 rounded bg-[#f0f0f0]" />
              </div>
            ))
          ) : memberRows.length ? memberRows.map((row) => <TeamDirectoryRowView key={row.id} row={row} />) : (
            <div className="grid min-h-14 grid-cols-[2.4rem_260px_1fr] items-center border-t border-[#eeeeee] text-base text-[#8b8b8b]">
              <span />
              <span className="font-medium">No members found</span>
              <span>Accepted team members will appear in this list.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function InviteMemberForm() {
  const profile = useCurrentUser();
  const subscription = useCurrentSubscription();
  const members = useBusinessMembers(profile.data?.activeBusiness?.id, Boolean(profile.data?.activeBusiness?.id));
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
      systemNotify.success("Invitation sent");
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
      <TeamDirectory
        invitations={invitations}
        members={members.data ?? []}
        currentMembershipId={profile.data?.membership?.id}
        loading={members.isPending}
      />
    </main>
  );
}
