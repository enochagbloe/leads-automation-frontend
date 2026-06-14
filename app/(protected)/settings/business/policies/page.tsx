import type { Metadata } from "next";
import { BusinessSetupPlaceholderPage } from "@/components/business-setup/business-setup-placeholder-page";

export const metadata: Metadata = { title: "Policies" };

export default function PoliciesSettingsPage() {
  return <BusinessSetupPlaceholderPage activeKey="policies" title="Policies" description="Document the terms, cancellation rules, and policies BizReply should understand." />;
}
