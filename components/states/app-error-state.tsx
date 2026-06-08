import { AlertTriangle } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { cn } from "@/lib/utils";

export function AppErrorState({
  title = "Something went wrong",
  description = "We could not load this content. Please try again.",
  details,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-64 flex-col items-center justify-center rounded-xl border bg-card p-8 text-center", className)} role="alert">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="size-5" /></span>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {details && <details className="mt-3 max-w-lg text-left text-xs text-muted-foreground"><summary className="cursor-pointer">Technical details</summary><p className="mt-2 rounded-md bg-muted p-3 font-mono">{details}</p></details>}
      {onRetry && <AppButton variant="outline" className="mt-5" onClick={onRetry}>Try again</AppButton>}
    </div>
  );
}
