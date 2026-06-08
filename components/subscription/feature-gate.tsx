"use client";

import type { ReactNode } from "react";
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt";
import { useCurrentSubscription } from "@/hooks/use-subscription";
import { getRecommendedPlan, hasPlanFeature } from "@/lib/subscription";
import type { PlanFeatures, PlanFeatureKey } from "@/types/subscription";

export function FeatureGate({
  feature,
  minimumAnalytics = "BASIC",
  mode = "locked",
  message,
  children,
}: {
  feature: PlanFeatureKey;
  minimumAnalytics?: PlanFeatures["analytics"];
  mode?: "hidden" | "locked";
  message?: string;
  children: ReactNode;
}) {
  const subscription = useCurrentSubscription();
  if (!subscription.data) return null;

  const enabled = hasPlanFeature(subscription.data.plan.features, feature, minimumAnalytics);
  if (enabled) return children;
  if (mode === "hidden") return null;

  return <UpgradePrompt message={message ?? `${subscription.data.plan.name} does not include this feature.`} recommendedPlan={getRecommendedPlan(subscription.data.plan.code)} />;
}
