"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Globe2,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { AppEmptyState } from "@/components/app-empty-state";
import { AppErrorState } from "@/components/app-error-state";
import { BusinessSetupTabs } from "@/components/business-setup/business-setup-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBusinessKnowledgePreview } from "@/hooks/use-business-knowledge";
import { useBusinessSetupStatus } from "@/hooks/use-business-setup";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  BusinessKnowledgePreview,
  KnowledgeConfidence,
  KnowledgeReadinessLevel,
  KnowledgeSectionState,
  KnowledgeSectionStatus,
  KnowledgeSeverity,
  KnowledgeTopic,
} from "@/types/business-knowledge";

const LEVELS: Record<KnowledgeReadinessLevel, { label: string; description: string; tone: string; icon: LucideIcon }> = {
  NOT_READY: { label: "Not ready", description: "Core business information still needs attention.", tone: "bg-destructive/10 text-destructive", icon: AlertTriangle },
  PARTIAL: { label: "Partially ready", description: "BizReply knows useful details, but important gaps remain.", tone: "bg-warning/10 text-warning", icon: CircleAlert },
  AI_READY: { label: "AI ready", description: "The business has enough approved context for future AI replies.", tone: "bg-secondary text-primary", icon: Bot },
  BOOKING_READY: { label: "Booking ready", description: "Business context and booking details are ready.", tone: "bg-success/10 text-success", icon: CheckCircle2 },
};
const SECTION_STATES: Record<KnowledgeSectionState, { label: string; tone: string }> = {
  MISSING: { label: "Missing", tone: "bg-destructive/10 text-destructive" },
  INCOMPLETE: { label: "Incomplete", tone: "bg-warning/10 text-warning" },
  PARTIAL: { label: "Partial", tone: "bg-secondary text-primary" },
  READY: { label: "Ready", tone: "bg-success/10 text-success" },
};
const SECTION_ICONS: Record<keyof BusinessKnowledgePreview["sections"], LucideIcon> = {
  profile: BriefcaseBusiness,
  services: WalletCards,
  availability: CalendarClock,
  policies: FileText,
  whatsapp: MessageCircle,
};
const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General", PAYMENT: "Payment", DEPOSIT: "Deposit", REFUND: "Refund", CANCELLATION: "Cancellation",
  RESCHEDULING: "Rescheduling", LATE_ARRIVAL: "Late arrival", NO_SHOW: "No-show", TRANSPORTATION: "Transportation",
  SERVICE_AREA: "Service area", APPOINTMENT: "Appointment", PRIVACY: "Privacy", TERMS: "Terms", OTHER: "Other",
};
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday",
  FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};

function titleCase(value?: string | null) {
  return value ? value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : null;
}

function KnowledgeLoading() {
  return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8"><Skeleton className="h-9 w-72" /><Skeleton className="mt-3 h-4 w-[520px] max-w-full" /><Skeleton className="mt-6 h-48 rounded-xl" /><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-44 rounded-xl" />)}</div><div className="mt-5 grid gap-5 xl:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-72 rounded-xl" />)}</div></main>;
}

function StatusPill({ state }: { state: KnowledgeSectionState }) {
  const item = SECTION_STATES[state];
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", item.tone)}>{item.label}</span>;
}

function Progress({ value, label }: { value: number; label: string }) {
  return <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

function OverallReadiness({ data, onRefresh, refreshing }: { data: BusinessKnowledgePreview; onRefresh: () => void; refreshing: boolean }) {
  const level = LEVELS[data.readiness.level];
  const Icon = level.icon;
  return <AppCard className="mt-6 overflow-hidden shadow-none"><div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)_auto] lg:items-center"><div className="flex items-baseline gap-2 lg:block"><strong className="text-5xl font-bold tracking-tight tabular-nums text-primary">{data.readiness.overallScore}%</strong><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:mt-2 lg:block">Overall readiness</span></div><div><span className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold", level.tone)}><Icon className="size-3.5" />{level.label}</span><h2 className="mt-3 text-lg font-bold">What BizReply knows today</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{level.description} This deterministic preview shows approved business context only.</p><div className="mt-4 max-w-2xl"><Progress value={data.readiness.overallScore} label="Overall business knowledge readiness" /></div><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold"><span className={cn("rounded-lg px-3 py-2", data.readiness.isAiReady ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{data.readiness.isAiReady ? "AI context ready" : "AI context not ready"}</span><span className={cn("rounded-lg px-3 py-2", data.readiness.isBookingReady ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{data.readiness.isBookingReady ? "Booking context ready" : "Booking context not ready"}</span></div></div><div className="flex items-center gap-3 lg:flex-col lg:items-end"><AppButton variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}><RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />Refresh preview</AppButton><span className="text-[11px] text-muted-foreground">Updated {new Date(data.generatedAt).toLocaleString()}</span></div></div></AppCard>;
}

function SectionCard({ section, name }: { section: KnowledgeSectionStatus; name: keyof BusinessKnowledgePreview["sections"] }) {
  const Icon = SECTION_ICONS[name];
  return <article className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-4" /></span><StatusPill state={section.status} /></div><div className="mt-4 flex items-end justify-between gap-3"><h3 className="text-sm font-bold">{section.label}</h3><strong className="text-xl font-bold tabular-nums">{section.score}%</strong></div><div className="mt-3"><Progress value={section.score} label={`${section.label} readiness`} /></div><p className="mt-3 min-h-10 text-xs leading-5 text-muted-foreground">{section.description}</p><Link href={section.route} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg text-xs font-bold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">Review section <ArrowRight className="size-3.5" /></Link></article>;
}

function DetailRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: LucideIcon }) {
  return <div className="flex gap-3 border-b py-3 first:pt-0 last:border-0 last:pb-0">{Icon && <Icon className="mt-0.5 size-4 shrink-0 text-primary" />}<div className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className={cn("mt-1 break-words text-sm", value ? "font-medium" : "italic text-muted-foreground")}>{value || "Not provided"}</dd></div></div>;
}

function SummaryPanel({ data }: { data: BusinessKnowledgePreview["businessSummary"] }) {
  const location = [data.city, data.country].filter(Boolean).join(", ");
  return <AppCard className="shadow-none"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><BriefcaseBusiness className="size-5" /></span><div><h2 className="font-bold">Business summary</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Core identity and contact context BizReply can reference.</p></div></div><dl className="mt-5 grid gap-x-6 sm:grid-cols-2"><DetailRow label="Business name" value={data.name} /><DetailRow label="Industry" value={titleCase(data.industry)} /><div className="sm:col-span-2"><DetailRow label="Description" value={data.description} /></div><DetailRow label="Location" value={location} icon={MapPin} /><DetailRow label="Service area" value={data.serviceArea} icon={Globe2} /><DetailRow label="Phone" value={data.phone} icon={Phone} /><DetailRow label="Email" value={data.email} /><DetailRow label="Website" value={data.website} /><DetailRow label="Timezone / currency" value={`${data.timezone} · ${data.defaultCurrency}`} /></dl></AppCard>;
}

function ServicesPanel({ data }: { data: BusinessKnowledgePreview["servicesPreview"] }) {
  return <AppCard className="shadow-none"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-bold">Services knowledge</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{data.readyForAi} of {data.active} active services are ready for AI context.</p></div><div className="flex gap-2 text-[11px] font-bold"><span className="rounded-lg bg-muted px-2.5 py-1.5">Missing prices: {data.missingPrices.length}</span><span className="rounded-lg bg-muted px-2.5 py-1.5">Missing durations: {data.missingDurations.length}</span></div></div>{data.items.length ? <div className="mt-5 grid gap-3">{data.items.map((service) => <article key={service.id} className="rounded-xl border bg-muted/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold">{service.name}</h3><p className="mt-1 text-xs text-muted-foreground">{service.category || "Uncategorized"} · {titleCase(service.readinessStatus)}</p></div><span className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-bold text-primary">{service.priceDisplay}</span></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{service.description || "No service description provided."}</p><div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold"><span className="rounded-md bg-card px-2 py-1">{service.durationMinutes ? `${service.durationMinutes} minutes` : "Duration missing"}</span><span className="rounded-md bg-card px-2 py-1">{service.isBookable ? "Bookable" : "Not bookable"}</span>{service.missingFields.map((field) => <span key={field} className="rounded-md bg-warning/10 px-2 py-1 text-warning">{titleCase(field)}</span>)}</div></article>)}</div> : <AppEmptyState className="mt-5 min-h-48" title="No services configured" description="Add services so BizReply understands what this business offers." icon={WalletCards} />}</AppCard>;
}

function AvailabilityPanel({ data }: { data: BusinessKnowledgePreview["availabilityPreview"] }) {
  const gaps = [...data.gaps.missingDays, ...data.gaps.invalidRules];
  return <AppCard className="shadow-none"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><CalendarClock className="size-5" /></span><div><h2 className="font-bold">Availability preview</h2><p className="mt-1 text-xs text-muted-foreground">{data.timezone} · {data.openDays} open days · {data.closedDays} closed days</p></div></div><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", data.hasCompleteWeeklySchedule ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{data.hasCompleteWeeklySchedule ? "Schedule ready" : "Incomplete"}</span></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{data.readableHours.map((item) => { const [day, hours] = item.split(": "); return <div key={item} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs"><span className="font-semibold">{DAY_LABELS[day] ?? titleCase(day)}</span><span className="text-muted-foreground">{hours}</span></div>; })}</div>{gaps.length > 0 && <p className="mt-4 rounded-lg bg-warning/10 p-3 text-xs font-semibold text-warning">Review missing or invalid schedule days: {gaps.map((day) => DAY_LABELS[day] ?? titleCase(day)).join(", ")}</p>}</AppCard>;
}

function PoliciesPanel({ data }: { data: BusinessKnowledgePreview["policiesPreview"] }) {
  return <AppCard className="shadow-none"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-bold">Policies preview</h2><p className="mt-1 text-xs text-muted-foreground">{data.customerFacing} customer-facing · {data.internalOnly} internal only</p></div><div className="flex gap-2 text-[11px] font-bold"><span className="rounded-lg bg-secondary px-2.5 py-1.5 text-primary">{data.configuredCategories.length} categories configured</span><span className="rounded-lg bg-warning/10 px-2.5 py-1.5 text-warning">{data.missingRecommendedCategories.length} recommended missing</span></div></div>{data.items.length ? <div className="mt-5 grid gap-3">{data.items.map((policy) => <article key={policy.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold">{policy.title}</h3><p className="mt-1 text-xs text-primary">{CATEGORY_LABELS[policy.category] ?? titleCase(policy.category)}</p></div><div className="flex flex-wrap justify-end gap-1.5"><span className="rounded-lg bg-success/10 px-2.5 py-1.5 text-[11px] font-bold text-success">Customer-facing</span><span className="rounded-lg bg-muted px-2.5 py-1.5 text-[11px] font-bold">Priority {policy.priority}</span></div></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{policy.shortSummary || "No short summary provided."}</p></article>)}</div> : <AppEmptyState className="mt-5 min-h-48" title="No customer-facing policies" description="Add approved policies so BizReply can answer sensitive questions safely." icon={FileText} />}{data.missingRecommendedCategories.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{data.missingRecommendedCategories.map((category) => <span key={category} className="rounded-lg bg-warning/10 px-2.5 py-1.5 text-[11px] font-semibold text-warning">{CATEGORY_LABELS[category] ?? titleCase(category)}</span>)}</div>}</AppCard>;
}

function TopicList({ title, description, topics, safe }: { title: string; description: string; topics: KnowledgeTopic[]; safe: boolean }) {
  const Icon = safe ? ShieldCheck : ShieldAlert;
  const label = (value?: KnowledgeConfidence | KnowledgeSeverity) => value ? `${titleCase(value)} ${safe ? "confidence" : "priority"}` : null;
  return <AppCard className="shadow-none"><div className="flex gap-3"><span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", safe ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}><Icon className="size-5" /></span><div><h2 className="font-bold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div></div>{topics.length ? <div className="mt-5 divide-y">{topics.map((topic) => <article key={topic.key} className="py-4 first:pt-0 last:pb-0"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold">{topic.label}</h3>{label(safe ? topic.confidence : topic.severity) && <span className={cn("shrink-0 rounded-md px-2 py-1 text-[10px] font-bold", safe ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{label(safe ? topic.confidence : topic.severity)}</span>}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{topic.reason}</p></article>)}</div> : <p className="mt-5 rounded-lg bg-muted p-3 text-xs text-muted-foreground">{safe ? "No safe answer topics are available yet." : "No additional human-confirmation topics were identified."}</p>}</AppCard>;
}

function InstructionColumn({ title, items, tone, icon: Icon }: { title: string; items: string[]; tone: string; icon: LucideIcon }) {
  return <section className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2"><span className={cn("grid size-8 place-items-center rounded-lg", tone)}><Icon className="size-4" /></span><h3 className="text-sm font-bold">{title}</h3></div><ul className="mt-4 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-muted-foreground"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" />{item}</li>)}</ul></section>;
}

export function BusinessKnowledgePage() {
  const auth = useCurrentUser();
  const businessId = auth.data?.activeBusiness?.id;
  const role = auth.data?.membership?.role;
  const canView = role === "BUSINESS_OWNER" || role === "MANAGER";
  const preview = useBusinessKnowledgePreview(businessId, canView);
  useBusinessSetupStatus(businessId);

  if (auth.isPending) return <KnowledgeLoading />;
  if (!businessId) return <main className="p-6"><AppErrorState title="No active business" description="Select a business to review its knowledge preview." /></main>;
  if (!canView) return <main className="mx-auto w-full max-w-[1000px] p-6"><AppErrorState title="Knowledge preview unavailable" description="You do not have permission to view the business knowledge preview." /></main>;
  if (preview.isPending) return <KnowledgeLoading />;
  if (preview.isError || !preview.data) {
    const forbidden = preview.error instanceof ApiError && preview.error.code === "FORBIDDEN";
    return <main className="mx-auto w-full max-w-[1000px] p-6"><AppErrorState title={forbidden ? "Knowledge preview unavailable" : "Could not load knowledge preview"} description={forbidden ? "You do not have permission to view the business knowledge preview." : getApiErrorMessage(preview.error)} onRetry={forbidden ? undefined : () => void preview.refetch()} /></main>;
  }
  const data = preview.data;
  return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8"><header><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Business Knowledge Preview</h1><p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">Review what BizReply currently knows about your business before AI automation starts using it.</p></div><span className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"><Sparkles className="size-3.5 text-primary" />Deterministic preview · no AI generation</span></div><BusinessSetupTabs activeKey="knowledge-preview" className="mt-5" /></header>
    <OverallReadiness data={data} onRefresh={() => void preview.refetch()} refreshing={preview.isFetching} />
    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Section readiness">{Object.entries(data.sections).map(([name, section]) => <SectionCard key={name} name={name as keyof typeof data.sections} section={section} />)}</section>
    <div className="mt-5 grid items-start gap-5 xl:grid-cols-2"><SummaryPanel data={data.businessSummary} /><ServicesPanel data={data.servicesPreview} /><AvailabilityPanel data={data.availabilityPreview} /><PoliciesPanel data={data.policiesPreview} /><TopicList title="Safe to answer later" description="Approved topics BizReply can answer with high confidence once automation is enabled." topics={data.safeToAnswerTopics} safe /><TopicList title="Needs human confirmation" description="Topics where BizReply should avoid guessing and involve a person." topics={data.needsHumanConfirmationTopics} safe={false} /></div>
    <AppCard className="mt-5 shadow-none"><div><h2 className="font-bold">AI instructions preview</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">A read-only preview of the deterministic boundaries future automation will follow.</p></div><div className="mt-5 grid gap-4 lg:grid-cols-3"><InstructionColumn title="Can answer" items={data.aiInstructionsPreview.canAnswer} tone="bg-success/10 text-success" icon={ShieldCheck} /><InstructionColumn title="Should avoid" items={data.aiInstructionsPreview.shouldAvoid} tone="bg-warning/10 text-warning" icon={CircleAlert} /><InstructionColumn title="Should hand off" items={data.aiInstructionsPreview.shouldHandoff} tone="bg-destructive/10 text-destructive" icon={ShieldAlert} /></div></AppCard>
    <AppCard className="mt-5 shadow-none"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><ArrowRight className="size-5" /></span><div><h2 className="font-bold">Recommended next actions</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Complete these backend-prioritized steps to improve business knowledge readiness.</p></div></div>{data.recommendedNextActions.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{data.recommendedNextActions.map((action) => <article key={action.key} className="flex flex-col rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-bold">{action.label}</h3><span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold">Priority {action.priority}</span></div><p className="mt-2 flex-1 text-xs leading-5 text-muted-foreground">{action.description}</p><AppButton asChild size="sm" variant="outline" className="mt-4 self-start"><Link href={action.route}>Complete this step <ArrowRight className="size-3.5" /></Link></AppButton></article>)}</div> : <p className="mt-5 flex items-center gap-2 rounded-xl bg-success/10 p-4 text-sm font-semibold text-success"><CheckCircle2 className="size-4" />No additional setup actions are recommended.</p>}</AppCard>
    <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5" />This page is read-only and refreshes when business setup data changes.</p>
  </main>;
}
