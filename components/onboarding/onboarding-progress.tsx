export function OnboardingProgress({ current, total }: { current: number; total: number }) {
  const percentage = (current / total) * 100;
  return (
    <div className="space-y-3" aria-label={`Step ${current} of ${total}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>Step {current} of {total}</span>
        <span>{Math.round(percentage)}% complete</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
