"use client";

import { addDays, format, isSameDay, startOfWeek, subDays } from "date-fns";
import gsap from "gsap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

function visibleWeekDays(selectedDate: Date) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function CalendarDayStrip({
  selectedDate,
  onDateChange,
  className,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}) {
  const daysRef = useRef<HTMLDivElement | null>(null);
  const days = visibleWeekDays(selectedDate);

  const moveWeek = (direction: "previous" | "next") => {
    const element = daysRef.current;
    const distance = direction === "next" ? -18 : 18;
    const nextDate = direction === "next" ? addDays(selectedDate, 7) : subDays(selectedDate, 7);

    if (!element) {
      onDateChange(nextDate);
      return;
    }

    gsap.killTweensOf(element);
    gsap.to(element, {
      x: distance,
      opacity: 0,
      duration: 0.14,
      ease: "power2.in",
      onComplete: () => {
        onDateChange(nextDate);
        requestAnimationFrame(() => {
          gsap.fromTo(
            element,
            { x: -distance, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.22, ease: "power2.out" },
          );
        });
      },
    });
  };

  return (
    <nav className={cn("flex min-w-0 items-center justify-center gap-2", className)} aria-label="Calendar days">
      <button
        type="button"
        onClick={() => moveWeek("previous")}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-secondary/70 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Previous week"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      <div ref={daysRef} className="flex min-w-0 items-center gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden">
        {days.map((day) => {
          const active = isSameDay(day, selectedDate);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDateChange(day)}
              aria-current={active ? "date" : undefined}
              className={cn(
                "flex h-14 min-w-12 shrink-0 flex-col items-center justify-center rounded-full px-3 text-center outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-secondary text-primary ring-1 ring-primary/10"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
            >
              <span className="text-[10px] font-black uppercase leading-none tracking-[0.12em]">{format(day, "EEE")}</span>
              <span className="mt-1 text-base font-semibold leading-none tabular-nums">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => moveWeek("next")}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-secondary/70 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Next week"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
