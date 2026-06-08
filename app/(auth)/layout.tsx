import { CheckCircle2, LockKeyhole, MessagesSquare, Sparkles } from "lucide-react";
import { AppLogo } from "@/components/app-logo";

const assurances = [
  { icon: MessagesSquare, text: "Keep every customer reply organized" },
  { icon: Sparkles, text: "Build a calmer, more responsive business" },
  { icon: LockKeyhole, text: "Secure by design, ready for your team" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
      <section className="flex min-h-dvh flex-col px-5 py-5 sm:px-8 lg:px-12 lg:py-8">
        <header><AppLogo /></header>
        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-10 sm:py-14">{children}</div>
        <footer className="text-center text-xs text-muted-foreground sm:text-left">© 2026 BizReply AI. Built for better business conversations.</footer>
      </section>

      <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-14" aria-label="About BizReply AI">
        <div className="absolute -right-28 -top-28 size-80 rounded-full border border-primary-foreground/15" />
        <div className="absolute -right-10 -top-10 size-48 rounded-full border border-primary-foreground/15" />
        <div className="relative flex items-center gap-2 text-sm font-medium text-primary-foreground/75"><CheckCircle2 className="size-4 text-accent" /> Built for service-focused businesses</div>
        <div className="relative max-w-lg">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-accent">Clear conversations. Stronger business.</p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">Your customers deserve a timely, thoughtful reply.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-primary-foreground/75">BizReply AI gives your team a reliable foundation for handling business conversations with clarity and care.</p>
          <div className="mt-10 space-y-4">
            {assurances.map(({ icon: Icon, text }) => <div key={text} className="flex items-center gap-3 text-sm font-medium"><span className="grid size-9 place-items-center rounded-lg bg-primary-foreground/10"><Icon className="size-4" /></span>{text}</div>)}
          </div>
        </div>
        <p className="relative max-w-sm text-xs leading-5 text-primary-foreground/55">A focused workspace for teams who care about every customer interaction.</p>
      </aside>
    </main>
  );
}
