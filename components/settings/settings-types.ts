import type { LucideIcon } from "lucide-react";

export type SettingsSectionKey =
  | "general"
  | "notifications"
  | "personalization"
  | "follow-up"
  | "connect"
  | "billing"
  | "usage"
  | "storage"
  | "security"
  | "account";

export interface SettingsNavItem {
  key: SettingsSectionKey;
  label: string;
  description: string;
  icon: LucideIcon;
}
