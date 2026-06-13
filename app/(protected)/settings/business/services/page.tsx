import type { Metadata } from "next";
import { BusinessSetupPlaceholderPage } from "@/components/business-setup/business-setup-placeholder-page";

export const metadata: Metadata = { title: "Services & Pricing" };

export default function ServicesPricingSettingsPage() {
  return <BusinessSetupPlaceholderPage activeKey="services-pricing" title="Services & Pricing" description="Add the services your business offers and define their base prices." />;
}
