import type { Metadata } from "next";
import { AvailabilityPage } from "@/components/business-availability/availability-page";

export const metadata: Metadata = { title: "Availability" };

export default function AvailabilitySettingsPage() {
  return <AvailabilityPage />;
}
