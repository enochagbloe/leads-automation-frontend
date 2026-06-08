import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)} role="status">
      <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
