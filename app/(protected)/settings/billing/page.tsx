import type { Metadata } from "next";
import { BillingPage } from "@/components/subscription/billing-page";

export const metadata: Metadata = { title: "Billing & plan" };

export default function BillingPlanPage() {
  return <BillingPage />;
}
