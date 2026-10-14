import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Home } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarActivity } from "@/components/sidebar/sidebar-activity";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarNotificationInbox } from "@/components/sidebar/sidebar-notification-inbox";
import { notificationService } from "@/services/notification-service";
import type { ActionableNotification } from "@/types/notification";
import { leadService } from "@/services/lead-service";
import { appointmentService } from "@/services/appointment-service";
import type { CalendarAppointment } from "@/types/appointment";
import type { Lead } from "@/types/lead";

vi.mock("@/services/lead-service", () => ({ leadService: { list: vi.fn() } }));
vi.mock("@/services/appointment-service", () => ({ appointmentService: { calendar: vi.fn() } }));
vi.mock("@/services/notification-service", () => ({ notificationService: { list: vi.fn(), read: vi.fn(), dismiss: vi.fn() } }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
const sidebarState = vi.hoisted(() => ({ expanded: true, setMode: vi.fn() }));
vi.mock("@/components/sidebar/sidebar-provider", () => ({ useSidebar: () => ({
  mode: "EXPANDED", desktopExpanded: sidebarState.expanded, mobileOpen: false,
  setMode: sidebarState.setMode, setHovered: () => {}, setMobileOpen: () => {}, setInteractionOpen: () => {},
}) }));
let client: QueryClient;
beforeEach(() => { vi.resetAllMocks(); sidebarState.expanded = true; client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => { cleanup(); client.clear(); });
function mount(businessId: string | undefined, allowed: boolean) {
  return render(<QueryClientProvider client={client}><SidebarActivity businessId={businessId} canViewLeads={allowed} canViewAppointments={allowed} onNavigate={() => {}} /></QueryClientProvider>);
}
it.each([[undefined, true], ["biz", false]])("does not fetch without a business and access (%s, %s)", (id, allowed) => {
  mount(id, allowed as boolean);
  expect(leadService.list).not.toHaveBeenCalled();
  expect(appointmentService.calendar).not.toHaveBeenCalled();
});
it("shows real empty states", async () => {
  vi.mocked(leadService.list).mockResolvedValue({ data: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 0 } });
  vi.mocked(appointmentService.calendar).mockResolvedValue({ appointments: [], view: "week", dateFrom: "", dateTo: "" });
  mount("biz", true);
  expect(await screen.findByText("No leads yet.")).toBeTruthy();
  expect(await screen.findByText("No events in the next 7 days.")).toBeTruthy();
});
it("opens canonical lead details and filters past/cancelled events; refreshes after lead mutations", async () => {
  vi.mocked(leadService.list).mockResolvedValue({ data: [{ id: "lead/a", fullName: "Ada" } as Lead], pagination: { page: 1, limit: 5, total: 1, totalPages: 1 } });
  const future = new Date(Date.now() + 86_400_000).toISOString();
  vi.mocked(appointmentService.calendar).mockResolvedValue({ view: "week", dateFrom: "", dateTo: "", appointments: [
    { id: "1", title: "Consultation", startTime: future, timezone: "Africa/Accra", status: "CONFIRMED" },
    { id: "2", title: "Cancelled", startTime: future, timezone: "Africa/Accra", status: "CANCELLED" },
    { id: "3", title: "Past event", startTime: "2020-01-01T10:00:00Z", timezone: "Africa/Accra", status: "CONFIRMED" },
  ] as CalendarAppointment[] });
  mount("biz", true);
  expect((await screen.findByRole("link", { name: "Ada" })).getAttribute("href")).toBe("/leads?lead=lead%2Fa");
  expect(await screen.findByText("Consultation")).toBeTruthy();
  expect(screen.queryByText("Cancelled")).toBeNull();
  expect(screen.queryByText("Past event")).toBeNull();
  expect(leadService.list).toHaveBeenCalledWith({ page: 1, limit: 5, sortBy: "createdAt", sortOrder: "desc" });
  await client.invalidateQueries({ queryKey: ["leads", "list"] });
  await waitFor(() => expect(leadService.list).toHaveBeenCalledTimes(2));
});

it.each([true, false])("shows only permitted creation actions (allowed=%s) and no business switcher", async allowed => {
  render(<QueryClientProvider client={client}><AppSidebar navItems={[{ label: "Dashboard", href: "/dashboard", icon: Home, section: "main" }]} userName="Owner" userEmail="owner@example.com" currentPlan="PREMIUM" onOpenBilling={() => {}} canCreateLead={allowed} canCreateAppointment={allowed} /></QueryClientProvider>);
  expect(screen.queryByRole("button", { name: /Switch business/ })).toBeNull();
  expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/dashboard");
  if (!allowed) { expect(screen.queryByRole("button", { name: "Create" })).toBeNull(); return; }
  await userEvent.setup().click(screen.getByRole("button", { name: "Create" }));
  expect(screen.getByRole("menuitem", { name: "Lead" }).getAttribute("href")).toBe("/leads/new");
  expect(screen.getByRole("menuitem", { name: "Appointment" }).getAttribute("href")).toBe("/appointments/calendar?create=appointment");
});

it("opens notifications on demand, marks read, closes with Escape and restores focus", async () => {
  const notification = { id: "notice", businessId: "biz", title: "System update", message: "Your workspace is ready.", status: "UNREAD", createdAt: "2026-10-14T10:00:00Z", actions: [] } as unknown as ActionableNotification;
  vi.mocked(notificationService.list).mockResolvedValue({ data: [notification] });
  vi.mocked(notificationService.read).mockResolvedValue(undefined);
  render(<QueryClientProvider client={client}><SidebarNotificationInbox businessId="biz" unreadCount={1} canManage /></QueryClientProvider>);
  expect(notificationService.list).not.toHaveBeenCalled();
  const trigger = screen.getByRole("button", { name: "Notification inbox, 1 unread" });
  const user = userEvent.setup();
  await user.click(trigger);
  expect(await screen.findByRole("dialog", { name: "Inbox" })).toBeTruthy();
  expect(await screen.findByText("System update")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Mark as read" }));
  await waitFor(() => expect(notificationService.read).toHaveBeenCalledWith("notice"));
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.activeElement).toBe(trigger);
});

it("supports unread filtering without granting read-only users mutation controls", async () => {
  vi.mocked(notificationService.list).mockResolvedValue({ data: [] });
  render(<QueryClientProvider client={client}><SidebarNotificationInbox businessId="biz" /></QueryClientProvider>);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Notification inbox" }));
  expect(await screen.findByText("No notifications yet")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Unread" }));
  await waitFor(() => expect(notificationService.list).toHaveBeenCalledWith({ page: 1, limit: 20, status: "UNREAD" }));
  expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
});

it.each([true, false])("keeps the sidebar toggle available when expanded=%s", async expanded => {
  sidebarState.expanded = expanded;
  render(<QueryClientProvider client={client}><AppSidebar navItems={[]} userName="Owner" userEmail="owner@example.com" currentPlan="PREMIUM" onOpenBilling={() => {}} canCreateLead={false} canCreateAppointment={false} /></QueryClientProvider>);
  const button = screen.getByRole("button", { name: expanded ? "Collapse sidebar" : "Expand sidebar" });
  expect(button.getAttribute("aria-expanded")).toBe(String(expanded));
  await userEvent.setup().click(button);
  expect(sidebarState.setMode).toHaveBeenCalledWith(expanded ? "COLLAPSED" : "EXPANDED");
});
