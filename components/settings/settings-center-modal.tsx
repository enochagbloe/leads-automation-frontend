"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Bell,
  CreditCard,
  Database,
  HardDrive,
  LockKeyhole,
  Paintbrush,
  Plug,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppButton } from "@/components/app-button";
import { BillingSettingsSection } from "@/components/settings/billing-settings-section";
import { ConnectPluginsSection } from "@/components/settings/connect-plugins-section";
import { FollowUpSettingsSection } from "@/components/settings/follow-up-settings-section";
import { SettingsNavigation } from "@/components/settings/settings-navigation";
import { SettingsPlaceholderSection } from "@/components/settings/settings-placeholder-section";
import type { SettingsNavItem, SettingsSectionKey } from "@/components/settings/settings-types";
import { cn } from "@/lib/utils";
import type { AuthProfile } from "@/types/auth";

const settingsItems: SettingsNavItem[] = [
  { key: "general", label: "General", icon: Settings, description: "Workspace preferences and account defaults." },
  { key: "notifications", label: "Notifications", icon: Bell, description: "Control how BizReply notifies you and your team." },
  { key: "personalization", label: "Personalization", icon: Paintbrush, description: "Customize your workspace experience." },
  { key: "follow-up", label: "Follow-Up", icon: Sparkles, description: "Manage customer follow-up automation for the selected business." },
  { key: "connect", label: "Connect / Plugins", icon: Plug, description: "Connect external tools and services when integrations are available." },
  { key: "billing", label: "Billing", icon: CreditCard, description: "Manage your workspace subscription and billing status." },
  { key: "usage", label: "Usage", icon: Database, description: "Review workspace activity and limits." },
  { key: "storage", label: "Storage", icon: HardDrive, description: "Manage files, documents, and storage controls." },
  { key: "security", label: "Security and Login", icon: LockKeyhole, description: "Protect your account and manage sign-in settings." },
  { key: "account", label: "Account", icon: UserRound, description: "Manage your personal account information." },
];

export function SettingsCenterModal({
  open,
  section,
  profile,
  onOpenChange,
  onSectionChange,
}: {
  open: boolean;
  section: SettingsSectionKey;
  profile: AuthProfile;
  onOpenChange: (open: boolean) => void;
  onSectionChange: (section: SettingsSectionKey) => void;
}) {
  const [dirtySection, setDirtySection] = useState<SettingsSectionKey | null>(null);
  const activeItem = useMemo(() => settingsItems.find((item) => item.key === section) ?? settingsItems[0], [section]);

  const requestOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && dirtySection && !window.confirm("You have unsaved settings changes. Close Settings anyway?")) return;
    if (!nextOpen) setDirtySection(null);
    onOpenChange(nextOpen);
  };

  const selectSection = (nextSection: SettingsSectionKey) => {
    if (dirtySection && dirtySection !== nextSection && !window.confirm("You have unsaved settings changes. Switch sections anyway?")) return;
    setDirtySection(null);
    onSectionChange(nextSection);
  };

  return (
    <Dialog.Root open={open} onOpenChange={requestOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[140] bg-foreground/35 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[150] flex h-[min(90dvh,820px)] w-[min(calc(100vw-2rem),1180px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[24px] border bg-card text-card-foreground shadow-[0_30px_110px_rgba(20,35,27,0.28)] outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
          aria-describedby="settings-center-description"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 md:hidden">
            <Dialog.Title className="font-sora text-lg font-bold">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <AppButton size="icon" variant="ghost" aria-label="Close settings"><X className="size-5" /></AppButton>
            </Dialog.Close>
          </div>
          <Dialog.Title className="sr-only">Settings</Dialog.Title>
          <Dialog.Description id="settings-center-description" className="sr-only">Manage BizReply workspace settings.</Dialog.Description>
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <aside className="relative bg-muted/35 md:flex md:w-[264px] md:shrink-0 md:flex-col md:border-r">
              <div className="hidden h-16 shrink-0 items-center justify-between border-b px-4 md:flex">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Settings</p>
                  <p className="mt-0.5 max-w-[180px] truncate text-sm font-bold">{profile.activeBusiness?.name ?? profile.account.name}</p>
                </div>
                <Dialog.Close asChild>
                  <AppButton size="icon" variant="ghost" aria-label="Close settings"><X className="size-5" /></AppButton>
                </Dialog.Close>
              </div>
              <SettingsNavigation items={settingsItems} activeSection={section} onSelect={selectSection} />
            </aside>

            <main className="min-h-0 flex-1 overflow-y-auto bg-background/30">
              {section === "follow-up" ? (
                <FollowUpSettingsSection profile={profile} onDirtyChange={(dirty) => setDirtySection(dirty ? "follow-up" : null)} />
              ) : section === "billing" ? (
                <BillingSettingsSection profile={profile} />
              ) : section === "connect" ? (
                <ConnectPluginsSection />
              ) : (
                <SettingsPlaceholderSection item={activeItem} />
              )}
            </main>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export type { SettingsSectionKey };
