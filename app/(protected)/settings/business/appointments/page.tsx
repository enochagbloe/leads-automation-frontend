import type { Metadata } from "next";
import { AppointmentSettingsPage } from "@/components/calendar/appointment-settings-page";

export const metadata: Metadata = { title: "Appointment settings" };

export default function AppointmentBusinessSettingsPage() {
  return <AppointmentSettingsPage />;
}
