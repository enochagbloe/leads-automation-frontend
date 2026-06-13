import { TabSwitcher, type TabSwitcherItem } from "@/components/tab-switcher";

export type BusinessSetupTabKey = "business-profile" | "services-pricing" | "availability" | "policies";

export const businessSetupTabs: TabSwitcherItem[] = [
  { key: "business-profile", label: "Business profile", href: "/settings/business/profile" },
  { key: "services-pricing", label: "Services & Pricing", href: "/settings/business/services" },
  { key: "availability", label: "Availability", href: "/settings/business/availability" },
  { key: "policies", label: "Policies", href: "/settings/business/policies" },
];

export function BusinessSetupTabs({ activeKey, className }: { activeKey: BusinessSetupTabKey; className?: string }) {
  return <TabSwitcher items={businessSetupTabs} activeKey={activeKey} aria-label="Business setup sections" className={className} />;
}
