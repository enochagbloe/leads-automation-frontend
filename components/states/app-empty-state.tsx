import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { cn } from "@/lib/utils";

export function AppEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center", className)}>
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground"><Icon className="size-5" /></span>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {actionLabel && <AppButton className="mt-5" onClick={onAction}>{actionLabel}</AppButton>}
    </div>
  );
}
