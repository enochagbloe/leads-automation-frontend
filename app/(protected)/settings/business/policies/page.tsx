import type { Metadata } from "next";
import { PoliciesPage } from "@/components/business-policies/policies-page";

export const metadata: Metadata = { title: "Policies" };

export default function PoliciesSettingsPage() {
  return <PoliciesPage />;
}
