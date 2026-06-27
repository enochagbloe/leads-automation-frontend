"use client";

import { Building2, CalendarDays, ContactRound, CreditCard, LayoutDashboard, Menu, MessageSquareText, Smartphone, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserAccountMenu } from "@/components/account/user-account-menu";
import { AppButton } from "@/components/app-button";
import { AppErrorState } from "@/components/app-error-state";
import { ActionableNotificationHost } from "@/components/notifications/actionable-notification-host";
import { AppGlobalSearch } from "@/components/search/app-global-search";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { AppSidebar, type SidebarNavItem } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, useSidebar } from "@/components/sidebar/sidebar-provider";
import { FullScreenLoading, LogoutLoadingState } from "@/components/states/loading-states";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { useBusinesses, useSelectBusiness } from "@/hooks/use-businesses";
import { useNotificationCounts } from "@/hooks/use-notifications";
import { useCurrentSubscription } from "@/hooks/use-subscription";
import { ApiError } from "@/lib/api-client";
import { resetBusinessContext } from "@/lib/business-query-cache";
import { BUSINESS_ACCESS_DENIED_EVENT } from "@/lib/business-store";
import { canCreateBusiness } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { canAccessOperationalPage, canManageBilling as userCanManageBilling, canManageBusinessSettings as userCanManageBusinessSettings, canManageTeam as userCanManageTeam, getWorkspacePermissions } from "@/lib/workspace-permissions";
import type { MembershipStatus } from "@/types/auth";

export function ProtectedAppShell({ children }: { children: React.ReactNode }) {
  return <SidebarProvider><ProtectedAppShellContent>{children}</ProtectedAppShellContent></SidebarProvider>;
}

function getMembershipAccessMessage(status?: MembershipStatus) {
  if (status === "SUSPENDED_BY_PLAN") {
    return {
      title: "Business access limited",
      description: "Your access to this business is currently limited by your organization’s subscription plan. Contact your organization for further information.",
    };
  }
  if (status === "DISABLED") {
    return {
      title: "Business access disabled",
      description: "Your access to this business has been disabled. Contact your organization for further information.",
    };
  }
  if (status === "REMOVED") {
    return {
      title: "Business access removed",
      description: "Your access to this business has been removed. Contact your organization for further information.",
    };
  }
  if (status === "INVITED") {
    return {
      title: "Invite not accepted",
      description: "This business invitation has not been accepted yet. Open your invite link to join the workspace.",
    };
  }
  return null;
}

function ProtectedAppShellContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const client = useQueryClient();
  const { mode, toggleMobile } = useSidebar();
  const profile = useCurrentUser();
  const logout = useLogout();
  const businesses = useBusinesses();
  const selectBusiness = useSelectBusiness();
  const permissions = getWorkspacePermissions(profile.data);
  const canManageBilling = userCanManageBilling(profile.data);
  const accountCanCreateBusiness = Boolean(
    profile.data && (
      profile.data.account.canCreateBusiness ??
      profile.data.canCreateBusiness ??
      profile.data.account.accountType !== "STAFF_ONLY"
    ),
  );
  const canManageBusinessSettings = userCanManageBusinessSettings(profile.data);
  const canManageTeam = userCanManageTeam(profile.data);
  const subscription = useCurrentSubscription(canManageBilling || accountCanCreateBusiness);
  const activeBusinessId = profile.data?.activeBusiness?.id;
  const canViewNotifications = permissions.canViewNotifications || permissions.canManageOwnNotifications;
  const notificationCounts = useNotificationCounts(canViewNotifications ? activeBusinessId : null);
  const businessCreation = subscription.data ? canCreateBusiness(subscription.data) : null;
  const sessionEnded = profile.error instanceof ApiError && profile.error.status === 401;

  useEffect(() => {
    if (sessionEnded) router.replace("/login");
    if (profile.data?.activeBusiness?.status === "PENDING_SETUP") router.replace("/onboarding");
    if (businesses.data?.length === 0 && accountCanCreateBusiness) router.replace("/businesses/new");
  }, [accountCanCreateBusiness, businesses.data?.length, profile.data?.activeBusiness?.status, router, sessionEnded]);

  useEffect(() => {
    const recoverBusinessAccess = () => void resetBusinessContext(client);
    window.addEventListener(BUSINESS_ACCESS_DENIED_EVENT, recoverBusinessAccess);
    return () => window.removeEventListener(BUSINESS_ACCESS_DENIED_EVENT, recoverBusinessAccess);
  }, [client]);

  if (profile.isPending) return <FullScreenLoading />;
  if (profile.isError) {
    return sessionEnded
      ? <AppErrorState title="Your session has ended" description="Redirecting you to sign in again." />
      : <AppErrorState title="Unable to load your account" description="Your session is still active. Refresh the page or try again shortly." />;
  }
  if (logout.isPending) return <LogoutLoadingState />;
  if (businesses.data?.length === 0 && !accountCanCreateBusiness) {
    return <AppErrorState title="No business access" description="You do not currently have access to any business workspace. Ask your organization to send you an invitation." />;
  }
  const membershipStatus = profile.data.membership?.status;
  const membershipAccessMessage = getMembershipAccessMessage(membershipStatus);
  if (membershipAccessMessage) {
    return <AppErrorState title={membershipAccessMessage.title} description={membershipAccessMessage.description} />;
  }

  const fullName = `${profile.data.user.firstName} ${profile.data.user.lastName}`;
  const logoutUser = () => logout.mutate(undefined, { onSettled: () => router.replace("/login") });
  const account = {
    id: profile.data.user.id,
    name: fullName,
    email: profile.data.user.email,
    avatarGradient: "from-[#13a884] via-[#198b6b] to-[#d6a63e]",
  };
  const businessGradients = [
    "from-[#13a884] via-[#198b6b] to-[#d6a63e]",
    "from-[#4f7cff] via-[#7767dc] to-[#df82ba]",
    "from-[#e7865b] via-[#d55d76] to-[#9f6dcc]",
  ];

  const memberships = businesses.data ?? [];
  const businessProfiles = memberships.map(({ business }, index) => ({
    id: business.id,
    name: business.name,
    email: business.email || profile.data.user.email,
    avatarGradient: businessGradients[index % businessGradients.length],
    shortcut: `⌘${index + 1}`,
  }));

  const canViewLeads = canAccessOperationalPage(profile.data, "leads");
  const canViewConversations = canAccessOperationalPage(profile.data, "conversations");
  const canViewAppointments = canAccessOperationalPage(profile.data, "appointments");
  const navItems: SidebarNavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "main", visible: permissions.canViewDashboard },
    { label: "Leads", href: "/leads", icon: ContactRound, section: "main", visible: canViewLeads },
    { label: "Inbox", href: "/conversations", icon: MessageSquareText, section: "main", visible: canViewConversations },
    { label: "Appointments", href: "/appointments/calendar", icon: CalendarDays, section: "main", visible: canViewAppointments },
    { label: "Business profile", href: "/settings/business/profile", icon: Building2, section: "workspace", visible: canManageBusinessSettings },
    { label: "Team members", href: "/settings/members", icon: Users, section: "workspace", visible: canManageTeam },
    { label: "WhatsApp connection", href: "/settings/business/whatsapp", icon: Smartphone, section: "workspace", visible: canManageBusinessSettings },
    { label: "Billing & plan", href: "/settings/billing", icon: CreditCard, section: "workspace", visible: canManageBilling },
  ];
  const openCreateBusiness = () => {
    if (accountCanCreateBusiness && businessCreation?.allowed) router.push("/businesses/new");
  };

  return (
    <RealtimeProvider activeBusinessId={profile.data.activeBusiness?.id} enabled={!logout.isPending}>
    <div className="min-h-dvh bg-background">
      <AppSidebar
        navItems={navItems}
        businesses={memberships}
        activeBusinessId={profile.data.activeBusiness?.id}
        activeBusinessName={profile.data.activeBusiness?.name ?? "BizReply AI"}
        workspaceName={profile.data.account.name}
        businessCount={profile.data.accountUsage.businessesCount}
        userName={fullName}
        userEmail={profile.data.user.email}
        currentPlan={subscription.data?.plan.code ?? profile.data.plan?.code}
        showBillingActions={canManageBilling}
        canCreateBusiness={accountCanCreateBusiness && (businessCreation?.allowed ?? false)}
        showCreateBusiness={accountCanCreateBusiness}
        createBusinessReason={accountCanCreateBusiness && businessCreation && !businessCreation.allowed ? businessCreation.reason : undefined}
        onSelectBusiness={selectBusiness}
        onCreateBusiness={openCreateBusiness}
        onOpenBilling={() => router.push("/settings/billing")}
      />

      <div className={cn("min-h-dvh transition-[margin-left] duration-[250ms] ease-out", mode === "EXPANDED" ? "lg:ml-[280px]" : "lg:ml-[72px]")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/85 px-4 backdrop-blur-xl sm:px-6" aria-label="Application top bar">
          <div className="flex min-w-0 items-center gap-3">
            <AppButton size="icon" variant="ghost" className="lg:hidden" aria-label="Open navigation" onClick={toggleMobile}><Menu className="size-5" /></AppButton>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">{profile.data.account.name} · {profile.data.accountUsage.businessesCount} {profile.data.accountUsage.businessesCount === 1 ? "business" : "businesses"}</p>
              <p className="truncate text-sm font-semibold">{profile.data.activeBusiness?.name ?? "No active business"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AppGlobalSearch />
            <UserAccountMenu
              user={account}
              accounts={businessProfiles}
              activeAccountId={profile.data.activeBusiness?.id}
              status="Online"
              notificationCount={notificationCounts.data?.unread ?? 0}
              currentPlan={subscription.data?.plan.code ?? profile.data.plan?.code}
              onSelectAccount={(business) => selectBusiness(business.id)}
              onAddAccount={openCreateBusiness}
              canAddAccount={accountCanCreateBusiness && (businessCreation?.allowed ?? false)}
              showAddAccount={accountCanCreateBusiness}
              addAccountLabel="Create new business"
              addAccountDisabledReason={accountCanCreateBusiness && businessCreation && !businessCreation.allowed ? businessCreation.reason : undefined}
              showBillingActions={canManageBilling}
              onMenuAction={(actionId) => {
                if (actionId === "billing-plan") router.push("/settings/billing");
              }}
              onLogout={logoutUser}
              loggingOut={logout.isPending}
            />
          </div>
        </header>
        {children}
        {canViewNotifications && <ActionableNotificationHost key={profile.data.activeBusiness?.id ?? "no-active-business"} activeBusinessId={profile.data.activeBusiness?.id} />}
      </div>
    </div>
    </RealtimeProvider>
  );
}
