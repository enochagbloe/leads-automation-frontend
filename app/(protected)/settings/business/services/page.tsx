import type { Metadata } from "next";
import { ServicesPricingPage } from "@/components/business-services/services-pricing-page";

export const metadata: Metadata = { title: "Services & Pricing" };

export default function ServicesPricingSettingsPage() {
  return <ServicesPricingPage />;
}
