"use client";

import { ArrowRight, BarChart3, Bot, Building2, CalendarDays, Check, Crown, Infinity, MessageSquareText, Sparkles, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppButton } from "@/components/app-button";
import { PremiumVerticalBarsBackground } from "@/components/subscription/premium-vertical-bars-background";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { formatPlanLimit, formatPlanPrice, PLAN_CATALOG } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import type { ActivePlan, AuthProfile, ProfileSubscription } from "@/types/auth";
import type { Plan, PlanCode, Subscription } from "@/types/subscription";

type SubscriptionWelcomeDialogProps = {
  profile: AuthProfile;
  subscription?: Subscription | null;
};

type TierConfig = {
  eyebrow: string;
  title: string;
  description: string;
  highlight: string;
  visual: "truchet" | "snippets" | "bars";
  accentClassName: string;
  icon: typeof Sparkles;
  benefits: Array<{ icon: typeof Check; label: string; description: string }>;
};

const welcomeStoragePrefix = "bizreply.subscription.welcome";

function getSubscriptionStatus(subscription?: Subscription | ProfileSubscription | null) {
  return subscription?.status;
}

function isWelcomableSubscription(subscription?: Subscription | ProfileSubscription | null) {
  const status = getSubscriptionStatus(subscription);
  return status === "ACTIVE" || status === "TRIALING";
}

function isCatalogPlan(plan: Plan | ActivePlan): plan is Plan {
  return "businesses" in plan.limits;
}

function normalizeWelcomePlan(plan?: Plan | ActivePlan | null): Plan | null {
  if (!plan) return null;
  if (isCatalogPlan(plan)) return plan;
  const catalogPlan = PLAN_CATALOG[plan.code];
  return {
    ...catalogPlan,
    id: plan.id,
    name: plan.name,
    priceMonthly: Number(plan.priceMonthly),
    currency: plan.currency as "GHS",
    limits: {
      businesses: plan.limits.maxBusinesses ?? catalogPlan.limits.businesses,
      staff: plan.limits.maxStaff,
      services: plan.limits.maxServices,
      appointments: plan.limits.maxAppointmentsPerMonth,
      conversations: plan.limits.maxConversationsPerMonth,
      aiReplies: plan.limits.maxAiRepliesPerMonth,
      knowledgeBaseItems: plan.limits.maxKnowledgeItems,
    },
    features: {
      analytics: plan.features.allowAnalytics ? catalogPlan.features.analytics : "NONE",
      brandingRemoval: plan.features.allowRemoveBranding,
      prioritySupport: plan.features.allowPrioritySupport,
    },
  };
}

function storageKey(accountId: string, subscriptionId: string, planCode: PlanCode) {
  return `${welcomeStoragePrefix}.${accountId}.${subscriptionId}.${planCode}`;
}

function createTierConfig(plan: Plan): TierConfig {
  const shared = [
    {
      icon: Building2,
      label: `${formatPlanLimit(plan.limits.businesses)} ${plan.limits.businesses === 1 ? "business" : "businesses"}`,
      description: "Create and manage workspaces under this account.",
    },
    {
      icon: CalendarDays,
      label: `${formatPlanLimit(plan.limits.appointments)} appointments / month`,
      description: "Keep bookings organized from your business calendar.",
    },
    {
      icon: MessageSquareText,
      label: `${formatPlanLimit(plan.limits.conversations)} conversations / month`,
      description: "Support customer conversations from your inbox.",
    },
  ];

  if (plan.code === "BASIC") {
    return {
      eyebrow: "Welcome to Basic",
      title: "Your BizReply AI workspace is active.",
      description: "You now have the essentials to manage customer replies, appointments, and business setup in one place.",
      highlight: "A clean foundation for getting your first operations running.",
      visual: "truchet",
      accentClassName: "from-primary/90 via-[#128c65] to-accent",
      icon: Sparkles,
      benefits: [
        ...shared,
        {
          icon: Users,
          label: `${formatPlanLimit(plan.limits.staff)} staff seats`,
          description: "Invite a small team to help manage the workspace.",
        },
      ],
    };
  }

  if (plan.code === "PLUS") {
    return {
      eyebrow: "You upgraded to Plus",
      title: "Your workspace has more room to grow.",
      description: "Plus unlocks higher limits and basic analytics so your team can handle more customers with less friction.",
      highlight: "More businesses, more services, and more customer activity.",
      visual: "snippets",
      accentClassName: "from-primary via-[#1fb985] to-[#6ec6ff]",
      icon: Sparkles,
      benefits: [
        ...shared,
        {
          icon: Users,
          label: `${formatPlanLimit(plan.limits.staff)} staff seats`,
          description: "Bring more teammates into daily customer workflows.",
        },
        {
          icon: BarChart3,
          label: "Basic analytics",
          description: "Track the signals that show how your business is performing.",
        },
      ],
    };
  }

  return {
    eyebrow: "Welcome to Premium",
    title: "You now have BizReply AI at full strength.",
    description: "Premium gives your workspace the highest limits, advanced analytics, branding removal, and priority support.",
    highlight: "Built for serious teams running high-volume operations.",
    visual: "bars",
    accentClassName: "from-[#0b6b50] via-accent to-[#1f2937]",
    icon: Crown,
    benefits: [
      ...shared,
      {
        icon: Infinity,
        label: "Unlimited staff, services, and knowledge",
        description: "Scale the operational foundation without worrying about core caps.",
      },
      {
        icon: Bot,
        label: `${formatPlanLimit(plan.limits.aiReplies)} AI replies / month`,
        description: "Prepare for higher-volume automation as your inbox grows.",
      },
      {
        icon: Crown,
        label: "Priority support and branding removal",
        description: "Give your team a more premium customer-facing experience.",
      },
    ],
  };
}

function TierVisual({ plan, config }: { plan: Plan; config: TierConfig }) {
  const Icon = config.icon;
  return (
    <div className="relative flex min-h-[300px] overflow-hidden rounded-[1.5rem] border bg-foreground p-6 text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] lg:min-h-[420px]">
      {config.visual === "truchet" && (
        <div
          className="absolute inset-0 opacity-95"
          style={{
            backgroundImage:
              "radial-gradient(circle at 0 0, rgb(255 255 255 / 0.28) 0 12%, transparent 13% 100%), radial-gradient(circle at 100% 100%, rgb(255 255 255 / 0.22) 0 12%, transparent 13% 100%), linear-gradient(135deg, #075e45, #128c65 52%, #b98926)",
            backgroundSize: "54px 54px, 54px 54px, 100% 100%",
          }}
        />
      )}
      {config.visual === "snippets" && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgb(255_255_255/0.34),transparent_26%),radial-gradient(circle_at_88%_18%,rgb(110_198_255/0.52),transparent_28%),radial-gradient(circle_at_52%_86%,rgb(18_140_101/0.9),transparent_34%),linear-gradient(135deg,#053f32,#0b6b50_45%,#17324d)]" />
      )}
      {config.visual === "bars" && (
        <PremiumVerticalBarsBackground />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,transparent,rgb(0_0_0/0.34))]" />
      <div className="relative z-10 flex w-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur">BizReply AI</span>
          <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-semibold backdrop-blur">{formatPlanPrice(plan)} / month</span>
        </div>
        <div>
          <span className={cn("grid size-16 place-items-center rounded-2xl bg-gradient-to-br shadow-2xl", config.accentClassName)}>
            <Icon className="size-7" />
          </span>
          <p className="mt-5 text-sm font-medium uppercase tracking-[0.22em] text-white/72">{plan.name} plan</p>
          <h3 className="mt-3 max-w-sm text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl">{config.highlight}</h3>
        </div>
      </div>
    </div>
  );
}

export function SubscriptionWelcomeDialog({ profile, subscription }: SubscriptionWelcomeDialogProps) {
  const sourcePlan = subscription?.plan ?? profile.plan;
  const activePlan = useMemo(() => normalizeWelcomePlan(sourcePlan), [sourcePlan]);
  const activeSubscription = subscription ?? profile.subscription;
  const [open, setOpen] = useState(false);
  const [seenKey, setSeenKey] = useState<string | null>(null);

  const config = useMemo(() => activePlan ? createTierConfig(activePlan) : null, [activePlan]);

  useEffect(() => {
    if (!activePlan || !activeSubscription?.id || !isWelcomableSubscription(activeSubscription)) return;
    const key = storageKey(profile.account.id, activeSubscription.id, activePlan.code);
    if (window.localStorage.getItem(key)) return;
    const timeout = window.setTimeout(() => {
      setSeenKey(key);
      setOpen(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activePlan, activeSubscription, profile.account.id]);

  const close = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && seenKey) window.localStorage.setItem(seenKey, new Date().toISOString());
  };

  if (!activePlan || !config) return null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogPortal>
        <DialogOverlay className="z-[100] bg-foreground/30 backdrop-blur-[1px]" />
        <DialogContent className="left-1/2 top-1/2 z-[110] grid w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.75rem] border bg-card p-2 shadow-[0_28px_90px_rgba(20,35,27,0.28)] md:grid-cols-[0.92fr_1fr]">
          <DialogTitle className="sr-only">{config.eyebrow}</DialogTitle>
          <DialogDescription className="sr-only">{config.description}</DialogDescription>
          <TierVisual plan={activePlan} config={config} />
          <section className="relative flex flex-col p-5 sm:p-7">
            <button
              type="button"
              onClick={() => close(false)}
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close subscription welcome"
            >
              <X className="size-4" />
            </button>
            <div className="pr-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{config.eyebrow}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">{config.title}</h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{config.description}</p>
            </div>
            <div className="mt-7 grid gap-3 rounded-2xl border bg-muted/20 p-4">
              {config.benefits.map((benefit) => {
                return (
                  <div key={benefit.label} className="flex gap-3">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success text-success-foreground"><Check className="size-3.5" strokeWidth={3} /></span>
                    <div>
                      <p className="text-sm font-bold">{benefit.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-7 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Plan benefits are shared across every business in this workspace.</p>
              <AppButton asChild className="min-w-[178px] px-5" onClick={() => close(false)}>
                <Link href="/settings/billing"><span className="whitespace-nowrap">View plan details</span><ArrowRight className="size-4 shrink-0" /></Link>
              </AppButton>
            </div>
          </section>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
