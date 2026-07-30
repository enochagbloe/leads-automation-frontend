"use client";

import { SettingsEmpty, SettingsSectionHeader } from "@/components/settings/settings-primitives";
import type { SettingsNavItem } from "@/components/settings/settings-types";

export function SettingsPlaceholderSection({ item }: { item: SettingsNavItem }) {
  return (
    <>
      <SettingsSectionHeader title={item.label} description={item.description} />
      <SettingsEmpty
        icon={item.icon}
        title={`${item.label} is coming later`}
        description="This settings section will be available in a later sprint."
      />
    </>
  );
}
