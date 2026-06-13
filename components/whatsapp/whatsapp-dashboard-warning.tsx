"use client";

import { AlertTriangle, ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/app-button";
import { useCurrentUser } from "@/hooks/use-auth";
import { useWhatsAppStatus } from "@/hooks/use-whatsapp";

export function WhatsAppDashboardWarning() {
  const profile = useCurrentUser();
  const businessId = profile.data?.activeBusiness?.id;
  const status = useWhatsAppStatus(businessId);
  if (!businessId || status.isPending || status.isError || status.data.status === "CONNECTED") return null;
  const owner = profile.data?.membership?.role === "BUSINESS_OWNER";
  const issue = status.data.status === "ERROR";
  return <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className={issue ? "grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive" : "grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"}>{issue ? <AlertTriangle className="size-5" /> : <MessageCircle className="size-5" />}</span><div><h2 className="font-bold">{issue ? "WhatsApp connection needs attention" : "WhatsApp is not connected"}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{owner ? "Connect WhatsApp to start receiving and replying to customer messages." : "Ask the business owner to connect or restore WhatsApp."}</p></div></div>{owner && <AppButton variant="outline" asChild><Link href="/settings/business/whatsapp">Manage WhatsApp <ArrowRight className="size-4" /></Link></AppButton>}</section>;
}
