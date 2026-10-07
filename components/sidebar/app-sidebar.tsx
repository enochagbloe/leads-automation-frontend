"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Settings2,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BusinessMembership } from "@/types/auth";
import type { PlanCode } from "@/types/subscription";
import { AppButton } from "@/components/app-button";
import { AppLogo } from "@/components/app-logo";
import { useSidebar, type SidebarMode } from "@/components/sidebar/sidebar-provider";
import { cn } from "@/lib/utils";

export type SidebarNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  section: "main" | "workspace";
  visible?: boolean;
};

type AppSidebarProps = {
  navItems: SidebarNavItem[];
  businesses: BusinessMembership[];
  activeBusinessId?: string;
  activeBusinessName: string;
  workspaceName: string;
  businessCount: number;
  userName: string;
  userEmail: string;
  currentPlan?: PlanCode;
  showBillingActions?: boolean;
  canCreateBusiness: boolean;
  showCreateBusiness?: boolean;
  createBusinessReason?: string;
  onSelectBusiness: (businessId: string) => void;
  onCreateBusiness: () => void;
  onOpenBilling: () => void;
};

const MODES: { value: SidebarMode; label: string; description: string }[] = [
  { value: "EXPANDED", label: "Expanded", description: "Always show the full sidebar" },
  { value: "COLLAPSED", label: "Collapsed", description: "Keep navigation icon-only" },
  { value: "AUTO", label: "Auto", description: "Expand while hovering" },
];


function SidebarModeMenu({ expanded }: { expanded: boolean }) {
  const { mode, setMode, setInteractionOpen } = useSidebar();
  return (
    <DropdownMenu.Root onOpenChange={setInteractionOpen}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label="Sidebar settings">
          <Settings2 className="size-5 shrink-0" />
          <span className={cn("min-w-0 flex-1 whitespace-nowrap text-left transition-opacity duration-200", expanded ? "opacity-100" : "pointer-events-none opacity-0")}>Sidebar settings</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side="right" align="end" sideOffset={10} collisionPadding={12} className="account-menu-content z-[70] w-72 rounded-2xl border bg-popover p-2 shadow-[0_18px_55px_rgba(20,35,27,0.16)] outline-none">
          <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Sidebar mode</p>
          {MODES.map((item) => (
            <DropdownMenu.Item key={item.value} onSelect={() => setMode(item.value)} className="flex cursor-pointer select-none items-start gap-3 rounded-xl px-2 py-2.5 outline-none data-[highlighted]:bg-muted">
              <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border", mode === item.value && "border-primary bg-primary text-primary-foreground")}>{mode === item.value && <Check className="size-3" />}</span>
              <span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.description}</span></span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function roleLabel(role: BusinessMembership["role"]) {
  if (role === "BUSINESS_OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  return "Staff";
}

function membershipStatusLabel(status: BusinessMembership["status"]) {
  if (status === "SUSPENDED_BY_PLAN") return "Suspended";
  if (status === "DISABLED") return "Disabled";
  if (status === "REMOVED") return "Removed";
  if (status === "INVITED") return "Invite pending";
  return null;
}

function BusinessSwitcher({ expanded, businesses, activeBusinessId, activeBusinessName, workspaceName, businessCount, canCreateBusiness, showCreateBusiness = true, createBusinessReason, onSelectBusiness, onCreateBusiness }: Pick<AppSidebarProps, "businesses" | "activeBusinessId" | "activeBusinessName" | "workspaceName" | "businessCount" | "canCreateBusiness" | "showCreateBusiness" | "createBusinessReason" | "onSelectBusiness" | "onCreateBusiness"> & { expanded: boolean }) {
  const memberships = Array.isArray(businesses) ? businesses : [];
  const { setInteractionOpen } = useSidebar();
  return (
    <DropdownMenu.Root onOpenChange={setInteractionOpen}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="flex min-h-12 w-full items-center gap-3 rounded-xl border bg-muted/30 px-2.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Switch business. Current business: ${activeBusinessName}`}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><BriefcaseBusiness className="size-4" /></span>
          <span className={cn("min-w-0 flex-1 transition-opacity duration-200", expanded ? "opacity-100" : "pointer-events-none opacity-0")}><span className="block truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{workspaceName} · {businessCount} {businessCount === 1 ? "business" : "businesses"}</span><span className="block truncate text-sm font-semibold">{activeBusinessName}</span></span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-opacity duration-200", expanded ? "opacity-100" : "opacity-0")} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side="right" align="start" sideOffset={10} collisionPadding={12} className="account-menu-content z-[70] w-72 rounded-2xl border bg-popover p-2 shadow-[0_18px_55px_rgba(20,35,27,0.16)] outline-none">
          <div className="px-2 pb-2 pt-1"><p className="text-xs font-bold">{workspaceName}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{businessCount} {businessCount === 1 ? "business" : "businesses"} on this workspace plan</p></div>
          {memberships.map(({ business, role, status }) => {
            const unavailable = status !== "ACTIVE";
            const statusLabel = membershipStatusLabel(status);
            return (
            <DropdownMenu.Item key={business.id} disabled={unavailable} onSelect={() => onSelectBusiness(business.id)} className="flex min-h-12 cursor-pointer select-none items-center gap-3 rounded-xl px-2 outline-none data-[highlighted]:bg-muted data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-bold text-primary">{business.name[0]?.toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{business.name}</span>
                <span className="mt-0.5 block truncate text-[10px] font-semibold text-muted-foreground">{statusLabel ?? roleLabel(role)}{activeBusinessId === business.id ? " · Current workspace" : ""}</span>
              </span>
              {activeBusinessId === business.id && <Check className="size-4 text-primary" />}
            </DropdownMenu.Item>
            );
          })}
          {showCreateBusiness && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item disabled={!canCreateBusiness} onSelect={onCreateBusiness} className="flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-xl px-2 text-sm font-semibold outline-none data-[highlighted]:bg-muted data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50">
                <span className="grid size-7 place-items-center rounded-lg border bg-card"><Plus className="size-4" /></span>Create new business
              </DropdownMenu.Item>
              {!canCreateBusiness && createBusinessReason && <p className="px-2 py-1 text-xs leading-5 text-muted-foreground">{createBusinessReason}</p>}
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function AppSidebar(props: AppSidebarProps) {
  const pathname = usePathname();
  const { mode, setMode, desktopExpanded, setHovered, mobileOpen, setMobileOpen } = useSidebar();
  const groups = [
    { id: "main", label: "Main", items: props.navItems.filter((item) => item.section === "main" && item.visible !== false) },
    { id: "workspace", label: "Workspace", items: props.navItems.filter((item) => item.section === "workspace" && item.visible !== false) },
  ];

  const sidebarContent = (expanded: boolean, mobile = false) => (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex min-w-0 items-center overflow-hidden">
          <AppLogo linked={false} compact className="shrink-0" />
          <span className={cn("ml-2.5 whitespace-nowrap text-lg font-bold tracking-tight transition-opacity duration-200", expanded ? "opacity-100" : "opacity-0")}>BizReply <span className="text-primary">AI</span></span>
        </div>
        {mobile ? (
          <AppButton size="icon" variant="ghost" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X className="size-5" /></AppButton>
        ) : (
          <AppButton size="icon" variant="ghost" className={cn("size-9 min-h-9 shrink-0 transition-opacity", expanded ? "opacity-100" : "pointer-events-none opacity-0")} aria-label={mode === "EXPANDED" ? "Collapse sidebar" : "Keep sidebar expanded"} onClick={() => setMode(mode === "EXPANDED" ? "COLLAPSED" : "EXPANDED")}>{mode === "EXPANDED" ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}</AppButton>
        )}
      </div>
      <div className="px-3 pt-3"><BusinessSwitcher expanded={expanded} {...props} /></div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Primary navigation">
        {groups.map((group) => (
          <section key={group.id} className="mb-5">
            <p className={cn("mb-2 h-4 whitespace-nowrap px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-opacity duration-200", expanded ? "opacity-100" : "opacity-0")}>{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} onClick={() => mobile && setMobileOpen(false)} aria-current={active ? "page" : undefined} title={!expanded ? item.label : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="size-5 shrink-0" /><span className={cn("whitespace-nowrap transition-opacity duration-200", expanded ? "opacity-100" : "pointer-events-none opacity-0")}>{item.label}</span></Link>;
              })}
            </div>
          </section>
        ))}
      </nav>
      <footer className="space-y-2 border-t p-3">
        {props.showBillingActions !== false && props.currentPlan !== "PREMIUM" && <button type="button" onClick={props.onOpenBilling} className={cn("w-full overflow-hidden rounded-xl border border-primary/15 bg-secondary/55 p-3 text-left transition-colors hover:bg-secondary", !expanded && "px-2")}><div className="flex items-center gap-3"><Sparkles className="size-5 shrink-0 text-primary" /><span className={cn("min-w-0 transition-opacity duration-200", expanded ? "opacity-100" : "pointer-events-none opacity-0")}><span className="block whitespace-nowrap text-xs font-bold">Upgrade your plan</span><span className="mt-0.5 block whitespace-nowrap text-[10px] text-muted-foreground">{props.currentPlan ?? "Basic"} plan active</span></span></div></button>}
        <SidebarModeMenu expanded={expanded} />
        <div className="flex min-h-12 items-center gap-3 rounded-xl px-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"><UserRound className="size-4" /></span>
          <span className={cn("min-w-0 transition-opacity duration-200", expanded ? "opacity-100" : "pointer-events-none opacity-0")}><span className="block truncate text-xs font-bold">{props.userName}</span><span className="block truncate text-[10px] text-muted-foreground">{props.userEmail}</span></span>
        </div>
      </footer>
    </>
  );

  return (
    <>
      <aside onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setHovered(true)} className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r bg-card shadow-sm transition-[width] duration-[250ms] ease-out lg:flex", desktopExpanded ? "w-[280px]" : "w-[72px]")} aria-label="Application sidebar">{sidebarContent(desktopExpanded)}</aside>
      <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className={cn("fixed inset-0 z-40 bg-foreground/35 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")} />
      <aside inert={!mobileOpen} className={cn("fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-hidden border-r bg-card shadow-2xl transition-transform duration-[250ms] ease-out lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")} aria-label="Mobile navigation" aria-hidden={!mobileOpen}>{sidebarContent(true, true)}</aside>
    </>
  );
}
