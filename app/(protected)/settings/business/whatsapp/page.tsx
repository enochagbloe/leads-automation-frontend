import type { Metadata } from "next";
import { SettingsWhatsAppPage } from "@/components/whatsapp/whatsapp-settings-page";

export const metadata: Metadata = { title: "WhatsApp connection" };
export default function WhatsAppSettingsPage() { return <SettingsWhatsAppPage />; }
