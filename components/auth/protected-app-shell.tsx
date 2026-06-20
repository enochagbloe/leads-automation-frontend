"use client";

import { Building2, CalendarDays, ContactRound, CreditCard, LayoutDashboard, Menu, MessageSquareText, Smartphone, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserAccountMenu } from "@/components/account/user-account-menu";
import { AppButton } from "@/components/app-button";
import { AppErrorState } from "@/components/app-error-state";
import { AppGlobalSearch } from "@/components/search/app-global-search";
import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { AppSidebar, type SidebarNavItem } from "@/components/sidebar/app-sidebar";
import { SidebarProvider, useSidebar } from "@/components/sidebar/sidebar-provider";
import { FullScreenLoading, LogoutLoadingState } from "@/components/states/loading-states";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { useBusinesses, useSelectBusiness } from "@/hooks/use-businesses";
import { useCurrentSubscription } from "@/hooks/use-subscription";
import { ApiError } from "@/lib/api-client";
import { resetBusinessContext } from "@/lib/business-query-cache";
import { BUSINESS_ACCESS_DENIED_EVENT } from "@/lib/business-store";
import { canCreateBusiness } from "@/lib/subscription";
import { cn } from "@/lib/utils";

export function ProtectedAppShell({ children }: { children: React.ReactNode }) {
  return <SidebarProvider><ProtectedAppShellContent>{children}</ProtectedAppShellContent></SidebarProvider>;
}

function ProtectedAppShellContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const client = useQueryClient();
  const { mode, toggleMobile } = useSidebar();
  const profile = useCurrentUser();
  const logout = useLogout();
  const businesses = useBusinesses();
  const selectBusiness = useSelectBusiness();
  const subscription = useCurrentSubscription();
  const businessCreation = subscription.data ? canCreateBusiness(subscription.data) : null;
  const sessionEnded = profile.error instanceof ApiError && profile.error.status === 401;

  useEffect(() => {
    if (sessionEnded) router.replace("/login");
    if (profile.data?.activeBusiness?.status === "PENDING_SETUP") router.replace("/onboarding");
    if (businesses.data?.length === 0) router.replace("/businesses/new");
  }, [businesses.data?.length, profile.data?.activeBusiness?.status, router, sessionEnded]);

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
  const businessProfiles = businesses.data?.map(({ business }, index) => ({
    id: business.id,
    name: business.name,
    email: business.email || profile.data.user.email,
    avatarGradient: businessGradients[index % businessGradients.length],
    shortcut: `⌘${index + 1}`,
  })) ?? [];
  const navItems: SidebarNavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "main" },
    { label: "Leads", href: "/leads", icon: ContactRound, section: "main" },
    { label: "Inbox", href: "/conversations", icon: MessageSquareText, section: "main" },
    { label: "Appointments", href: "/appointments/calendar", icon: CalendarDays, section: "main" },
    { label: "Business profile", href: "/settings/business/profile", icon: Building2, section: "workspace" },
    { label: "Team members", href: "/settings/members", icon: Users, section: "workspace", visible: profile.data.permissions.includes("members:manage") },
    { label: "WhatsApp connection", href: "/settings/business/whatsapp", icon: Smartphone, section: "workspace" },
    { label: "Billing & plan", href: "/settings/billing", icon: CreditCard, section: "workspace" },
  ];
  const openCreateBusiness = () => {
    if (businessCreation?.allowed) router.push("/businesses/new");
  };

  return (
    <RealtimeProvider activeBusinessId={profile.data.activeBusiness?.id} enabled={!logout.isPending}>
    <div className="min-h-dvh bg-background">
      <AppSidebar
        navItems={navItems}
        businesses={businesses.data ?? []}
        activeBusinessId={profile.data.activeBusiness?.id}
        activeBusinessName={profile.data.activeBusiness?.name ?? "BizReply AI"}
        workspaceName={profile.data.account.name}
        businessCount={profile.data.accountUsage.businessesCount}
        userName={fullName}
        userEmail={profile.data.user.email}
        currentPlan={subscription.data?.plan.code ?? profile.data.plan?.code}
        canCreateBusiness={businessCreation?.allowed ?? false}
        createBusinessReason={businessCreation && !businessCreation.allowed ? businessCreation.reason : undefined}
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
              notificationCount={0}
              currentPlan={subscription.data?.plan.code ?? profile.data.plan?.code}
              onSelectAccount={(business) => selectBusiness(business.id)}
              onAddAccount={openCreateBusiness}
              canAddAccount={businessCreation?.allowed ?? false}
              addAccountLabel="Create new business"
              addAccountDisabledReason={businessCreation && !businessCreation.allowed ? businessCreation.reason : undefined}
              onMenuAction={(actionId) => {
                if (actionId === "billing-plan") router.push("/settings/billing");
              }}
              onLogout={logoutUser}
              loggingOut={logout.isPending}
            />
          </div>
        </header>
        {children}
      </div>
    </div>
    </RealtimeProvider>
  );
}
