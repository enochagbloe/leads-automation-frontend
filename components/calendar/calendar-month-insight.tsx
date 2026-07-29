import { cn } from "@/lib/utils";

export function CalendarMissedDayInsight({
  missedCount,
  className,
}: {
  missedCount: number;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "min-w-[8.75rem] px-1 text-right text-xs font-semibold text-destructive",
        missedCount <= 0 && "invisible",
        className,
      )}
      aria-live="polite"
      aria-hidden={missedCount <= 0}
    >
      {missedCount > 0 ? `${missedCount} ${missedCount === 1 ? "missed appointment" : "missed appointments"}` : "0 missed appointments"}
    </p>
  );
}
