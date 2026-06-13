import type { Metadata } from "next";
import { BusinessProfilePage } from "@/components/business-profile/business-profile-page";

export const metadata: Metadata = { title: "Business profile" };

export default function BusinessProfileSettingsPage() {
  return <BusinessProfilePage />;
}
