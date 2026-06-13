import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/app-button";
import { resolveSetupRoute } from "@/lib/business-setup";
import type { BusinessSetupItem } from "@/types/business-setup";

export function BusinessSetupChecklist({ items, limit }: { items: BusinessSetupItem[]; limit?: number }) {
  const visible = typeof limit === "number" ? items.slice(0, limit) : items;
  const groups = [
    { key: "MANUAL_INBOX", label: "Manual inbox", items: visible.filter((item) => item.requiredFor === "MANUAL_INBOX") },
    { key: "AI_AUTOMATION", label: "Future automation", items: visible.filter((item) => item.requiredFor !== "MANUAL_INBOX") },
  ].filter((group) => group.items.length);
  return <div className="space-y-3">{groups.map((group) => <section key={group.key}><h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{group.label}</h4><ul className="divide-y rounded-xl border bg-card">{group.items.map((item) => {
    const route = resolveSetupRoute(item.route);
    return <li key={item.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><span className="size-2 rounded-full bg-current" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.label}</p>{item.planRequired && <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-primary">{item.planRequired}</span>}</div>{item.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>}</div>{route.available && route.href ? <AppButton size="sm" variant="outline" asChild><Link href={route.href}>Continue <ArrowRight className="size-3.5" /></Link></AppButton> : <AppButton size="sm" variant="outline" disabled title="This setup form is coming in a later Sprint 5 module"><LockKeyhole className="size-3.5" />Coming soon</AppButton>}</li>;
  })}</ul></section>)}</div>;
}
