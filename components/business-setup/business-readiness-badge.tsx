import { Bot, CheckCircle2, CircleDashed, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessReadinessStatus } from "@/types/business-setup";

const READINESS = {
  NOT_STARTED: { label: "Setup not started", description: "Start with the core details customers need.", icon: CircleDashed, tone: "bg-muted text-muted-foreground" },
  INCOMPLETE: { label: "Setup incomplete", description: "A few business details still need attention.", icon: CircleDashed, tone: "bg-warning/10 text-warning" },
  READY_FOR_MANUAL_INBOX: { label: "Inbox ready", description: "You can manage conversations manually, but automation still needs more business details.", icon: Inbox, tone: "bg-secondary text-primary" },
  READY_FOR_AI_AUTOMATION: { label: "Automation ready", description: "Your business profile has enough information for future automation.", icon: CheckCircle2, tone: "bg-success/10 text-success" },
} satisfies Record<BusinessReadinessStatus, { label: string; description: string; icon: typeof Bot; tone: string }>;

export function BusinessReadinessBadge({ status, showDescription = false, className }: { status: BusinessReadinessStatus; showDescription?: boolean; className?: string }) {
  const item = READINESS[status];
  const Icon = item.icon;
  return <div className={cn("inline-flex items-center gap-2", className)}><span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold", item.tone)}><Icon className="size-3.5" />{item.label}</span>{showDescription && <span className="text-xs text-muted-foreground">{item.description}</span>}</div>;
}
