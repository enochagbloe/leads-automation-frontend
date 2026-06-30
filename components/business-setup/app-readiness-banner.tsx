"use client";

import { AlertTriangle, ArrowRight, Building2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/app-button";
import { useBusinessSetupStatus } from "@/hooks/use-business-setup";
import { useWhatsAppStatus } from "@/hooks/use-whatsapp";
import { resolveSetupRoute } from "@/lib/business-setup";
import type { AuthProfile } from "@/types/auth";

type ReadinessIssue = {
  key: string;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  icon: typeof AlertTriangle;
};

function isProfileSetupKey(key: string) {
  return ["business-profile", "businessBasicInfo", "industryDescription", "location"].includes(key);
}

export function AppReadinessBanner({
  profile,
  canCreateBusiness,
  canManageBusinessSettings,
}: {
  profile: AuthProfile;
  canCreateBusiness: boolean;
  canManageBusinessSettings: boolean;
}) {
  const businessId = profile.activeBusiness?.id;
  const setup = useBusinessSetupStatus(businessId);
  const whatsapp = useWhatsAppStatus(businessId);
  const issues: ReadinessIssue[] = [];

  if (!profile.activeBusiness) {
    issues.push({
      key: "no-business",
      title: "Create your business workspace",
      description: canCreateBusiness
        ? "Set up your first business so BizReply can organize leads, inboxes, and appointments."
        : "You do not have an active business workspace. Ask an owner to invite you.",
      href: canCreateBusiness ? "/businesses/new" : undefined,
      actionLabel: "Create business",
      icon: Building2,
    });
  }

  if (businessId && !whatsapp.isPending && !whatsapp.isError && whatsapp.data.status !== "CONNECTED") {
    const canManageWhatsApp = profile.membership?.role === "BUSINESS_OWNER" && canManageBusinessSettings;
    const issue = whatsapp.data.status === "ERROR";
    issues.push({
      key: "whatsapp-not-connected",
      title: issue ? "WhatsApp connection needs attention" : "WhatsApp number is not connected",
      description: canManageWhatsApp
        ? "Connect or restore your WhatsApp number so customer messages can flow into BizReply."
        : "Ask the business owner to connect or restore WhatsApp for this business.",
      href: canManageWhatsApp ? "/settings/business/whatsapp" : undefined,
      actionLabel: issue ? "Review connection" : "Connect number",
      icon: MessageCircle,
    });
  }

  if (businessId && !setup.isPending && !setup.isError && !setup.data.isAiReady) {
    const profileItem = setup.data.missingItems.find((item) => isProfileSetupKey(item.key) || item.route === "/settings/business/profile");
    if (profileItem) {
      const route = resolveSetupRoute(profileItem.route);
      issues.push({
        key: "business-profile-incomplete",
        title: "Business profile is incomplete",
        description: canManageBusinessSettings
          ? "Complete your core business details so BizReply can answer customers accurately."
          : "Business profile details are incomplete. Ask an owner or manager to complete them.",
        href: canManageBusinessSettings && route.available && route.href ? route.href : undefined,
        actionLabel: "Complete profile",
        icon: AlertTriangle,
      });
    }
  }

  if (issues.length === 0) return null;

  const primary = issues[0];
  const Icon = primary.icon;
  const extraCount = issues.length - 1;

  return (
    <aside className="sticky top-16 z-20 border-b bg-warning text-warning-foreground shadow-[0_1px_0_rgba(255,255,255,0.16)_inset]" aria-label="Workspace readiness notice">
      <div className="mx-auto flex min-h-11 max-w-[1500px] flex-col gap-2 px-4 py-2 text-sm sm:flex-row sm:items-center sm:justify-center sm:px-6">
        <div className="flex min-w-0 items-center justify-center gap-2.5 text-center sm:text-left">
          <Icon className="size-4 shrink-0" />
          <p className="min-w-0">
            <span className="font-bold">{primary.title}</span>
            <span className="mx-1.5 opacity-80">—</span>
            <span className="opacity-95">{primary.description}</span>
            {extraCount > 0 && <span className="ml-2 rounded-full bg-warning-foreground/15 px-2 py-0.5 text-xs font-bold">+{extraCount} more</span>}
          </p>
        </div>
        {primary.href && primary.actionLabel && (
          <AppButton asChild size="sm" className="min-h-8 rounded-full bg-warning-foreground px-4 text-xs font-bold text-warning hover:bg-warning-foreground/90">
            <Link href={primary.href}>{primary.actionLabel}<ArrowRight className="size-3.5" /></Link>
          </AppButton>
        )}
      </div>
    </aside>
  );
}
