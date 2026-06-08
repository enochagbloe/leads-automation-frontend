import type { Metadata } from "next";
import { LeadForm } from "@/components/leads/lead-form";

export const metadata: Metadata = { title: "Create lead" };

export default function CreateLeadPage() {
  return <main className="mx-auto w-full max-w-4xl space-y-7 p-4 sm:p-6 lg:p-8"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">CRM workspace</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Create lead</h1><p className="mt-2 text-sm text-muted-foreground">Add a customer opportunity to the active business.</p></header><section className="rounded-xl border bg-card p-5 shadow-sm sm:p-7"><LeadForm /></section></main>;
}
