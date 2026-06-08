import { AppLogo } from "@/components/app-logo";

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-secondary/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full bg-accent/10 blur-3xl" />
      <header className="relative mx-auto flex h-20 w-full max-w-6xl items-center px-5 sm:px-8">
        <AppLogo linked={false} />
      </header>
      <div className="relative mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-3xl items-center px-5 pb-12 sm:px-8">
        {children}
      </div>
    </main>
  );
}
