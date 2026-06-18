import type { Metadata } from "next";
import { CalendarWorkspacePage } from "@/components/calendar/calendar-workspace-page";

export const metadata: Metadata = { title: "Appointments" };

export default function AppointmentsCalendarPage() {
  return <CalendarWorkspacePage />;
}
