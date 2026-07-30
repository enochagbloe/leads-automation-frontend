"use client";

import { CalendarDays, CreditCard, Plug, Workflow } from "lucide-react";
import { SettingsCard, SettingsEmpty, SettingsPanel, SettingsSectionHeader, StatusPill } from "@/components/settings/settings-primitives";

const integrations = [
  { label: "Calendar sync", icon: CalendarDays },
  { label: "Payment providers", icon: CreditCard },
  { label: "CRM tools", icon: Workflow },
];

export function ConnectPluginsSection() {
  return (
    <>
      <SettingsSectionHeader
        title="Connect and Plugins"
        description="Connect external tools and services to your BizReply workspace. This foundation is intentionally disabled until the integration backend is ready."
        action={<StatusPill tone="warning">Coming soon</StatusPill>}
      />
      <SettingsPanel>
        <div className="grid gap-3 sm:grid-cols-3">
          {integrations.map((item) => (
            <SettingsCard key={item.label} className="opacity-70">
              <item.icon className="size-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-bold">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Connection setup will be added later.</p>
            </SettingsCard>
          ))}
        </div>
        <SettingsEmpty
          icon={Plug}
          title="Plugin connections are not active yet"
          description="No external services are connected from this settings center in the current sprint."
        />
      </SettingsPanel>
    </>
  );
}
