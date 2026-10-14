"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  CalendarDays,
  Home,
  Inbox,
  SquarePen,
  ContactRound,
  Check,
  PanelLeft,
  PanelLeftClose,
  Settings2,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PlanCode } from "@/types/subscription";
import { AppButton } from "@/components/app-button";
import { useSidebar, type SidebarMode } from "@/components/sidebar/sidebar-provider";
import { SidebarNotificationInbox } from "@/components/sidebar/sidebar-notification-inbox";
import { SidebarActivity } from "@/components/sidebar/sidebar-activity";
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
  activeBusinessId?: string;
  userName: string;
  userEmail: string;
  currentPlan?: PlanCode;
  showBillingActions?: boolean;
  onOpenBilling: () => void;
  canCreateLead: boolean;
  canCreateAppointment: boolean;
  canViewNotifications?: boolean;
  canManageNotifications?: boolean;
  unreadNotifications?: number;
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
        <button type="button" className={cn("flex min-h-10 w-full items-center rounded-lg text-sm font-semibold text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", expanded ? "gap-3 px-3" : "justify-center px-0")} aria-label="Sidebar settings">
          <Settings2 className="size-5 shrink-0" />
          <span className={cn("min-w-0 flex-1 whitespace-nowrap text-left transition-opacity duration-200", expanded ? "opacity-100" : "sr-only")}>Sidebar settings</span>
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

export function AppSidebar(props: AppSidebarProps) {
  const pathname = usePathname();
  const { setMode, desktopExpanded, setHovered, mobileOpen, setMobileOpen, setInteractionOpen } = useSidebar();
  const shortcuts = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/conversations", label: "Inbox", icon: Inbox },
    { href: "/appointments/calendar", label: "Calendar", icon: CalendarDays },
  ].filter(item => props.navItems.some(nav => nav.href === item.href && nav.visible !== false));
  const canView = (href: string) => props.navItems.some(item => item.href === href && item.visible !== false);
  const createItems = [
    ...(props.canCreateLead ? [{ href: "/leads/new", label: "Lead", icon: ContactRound }] : []),
    ...(props.canCreateAppointment ? [{ href: "/appointments/calendar?create=appointment", label: "Appointment", icon: CalendarDays }] : []),
  ];
  const groups = [
    { id: "main", label: "Business", items: props.navItems.filter((item) => item.section === "main" && item.visible !== false && !shortcuts.some(shortcut => shortcut.href === item.href)) },
    { id: "workspace", label: "Workspace", items: props.navItems.filter((item) => item.section === "workspace" && item.visible !== false) },
  ];

  const notificationButton = props.canViewNotifications && props.activeBusinessId
    ? <SidebarNotificationInbox key={props.activeBusinessId} businessId={props.activeBusinessId} unreadCount={props.unreadNotifications} canManage={props.canManageNotifications} /> : null;
  const sidebarContent = (expanded: boolean, mobile = false) => (
    <>
      <div className={cn("flex h-16 shrink-0 items-center gap-1 border-b px-3", !expanded && "justify-center")}>
        <AppButton
          size="icon"
          variant="ghost"
          className="size-9 min-h-9 shrink-0"
          aria-label={mobile ? "Close navigation" : expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={expanded}
          title={mobile ? "Close navigation" : expanded ? "Collapse sidebar" : "Expand sidebar"}
          onClick={() => mobile ? setMobileOpen(false) : setMode(expanded ? "COLLAPSED" : "EXPANDED")}
        >
          {expanded ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
        </AppButton>
        {expanded && notificationButton}
      </div>
      {!expanded && notificationButton && <div className="flex justify-center pt-2">{notificationButton}</div>}
      {createItems.length > 0 && <div className="shrink-0 px-3 pt-3">
        <DropdownMenu.Root onOpenChange={setInteractionOpen}>
          <DropdownMenu.Trigger asChild><button type="button" aria-label="Create" title="Create" className={cn("flex min-h-10 w-full items-center rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", expanded ? "gap-2 px-2" : "justify-center")}><SquarePen className="size-5 shrink-0" /><span className={!expanded ? "sr-only" : undefined}>Create</span></button></DropdownMenu.Trigger>
          <DropdownMenu.Portal><DropdownMenu.Content side="right" align="start" sideOffset={8} collisionPadding={12} className="z-[70] min-w-44 rounded-lg border bg-popover p-1 shadow-lg">
            {createItems.map(item => <DropdownMenu.Item key={item.href} asChild><Link href={item.href} onClick={() => mobile && setMobileOpen(false)} className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-muted"><item.icon className="size-4" />{item.label}</Link></DropdownMenu.Item>)}
          </DropdownMenu.Content></DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>}
      <nav className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4" aria-label="Primary navigation">
        <div className={cn("mb-5 flex gap-1", expanded ? "items-center" : "flex-col")}>
          {shortcuts.map(item => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={active ? "page" : undefined} onClick={() => mobile && setMobileOpen(false)} className={cn("flex min-h-10 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted", expanded && "flex-1")}><item.icon className="size-4 shrink-0" />{expanded && item.label === "Home" && <span>Home</span>}</Link>;
          })}
        </div>
        {expanded && (!mobile || mobileOpen) && <SidebarActivity businessId={props.activeBusinessId} canViewLeads={canView("/leads")} canViewAppointments={canView("/appointments/calendar")} onNavigate={() => mobile && setMobileOpen(false)} />}
        {groups.filter(group => group.items.length > 0).map((group) => (
          <section key={group.id} className="mb-5">
            <p className={cn("mb-2 h-4 truncate px-2 text-xs font-medium text-muted-foreground transition-opacity duration-200", expanded ? "opacity-100" : "opacity-0")}>{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} onClick={() => mobile && setMobileOpen(false)} aria-current={active ? "page" : undefined} title={!expanded ? item.label : undefined} className={cn("flex min-h-11 items-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", expanded ? "gap-3 px-3" : "justify-center px-0", active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="size-5 shrink-0" /><span className={cn("min-w-0 flex-1 truncate transition-opacity duration-200", expanded ? "opacity-100" : "sr-only")}>{item.label}</span></Link>;
              })}
            </div>
          </section>
        ))}
      </nav>
      <footer className="space-y-2 border-t p-3">
        {props.showBillingActions !== false && props.currentPlan !== "PREMIUM" && <button type="button" onClick={props.onOpenBilling} className={cn("w-full overflow-hidden rounded-xl border border-primary/15 bg-secondary/55 p-3 text-left transition-colors hover:bg-secondary", !expanded && "px-2")}><div className={cn("flex items-center", expanded ? "gap-3" : "justify-center")}><Sparkles className="size-5 shrink-0 text-primary" /><span className={cn("min-w-0 transition-opacity duration-200", expanded ? "opacity-100" : "sr-only")}><span className="block whitespace-nowrap text-xs font-bold">Upgrade your plan</span><span className="mt-0.5 block whitespace-nowrap text-[10px] text-muted-foreground">{props.currentPlan ?? "Basic"} plan active</span></span></div></button>}
        <SidebarModeMenu expanded={expanded} />
        <div className={cn("flex min-h-12 items-center rounded-xl", expanded ? "gap-3 px-2.5" : "justify-center px-0")}>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"><UserRound className="size-4" /></span>
          <span className={cn("min-w-0 transition-opacity duration-200", expanded ? "opacity-100" : "sr-only")}><span className="block truncate text-xs font-bold">{props.userName}</span><span className="block truncate text-[10px] text-muted-foreground">{props.userEmail}</span></span>
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
