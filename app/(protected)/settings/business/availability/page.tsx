import type { Metadata } from "next";
import { BusinessSetupPlaceholderPage } from "@/components/business-setup/business-setup-placeholder-page";

export const metadata: Metadata = { title: "Availability" };

export default function AvailabilitySettingsPage() {
  return <BusinessSetupPlaceholderPage activeKey="availability" title="Availability" description="Set the working days and hours customers can expect from your business." />;
}
