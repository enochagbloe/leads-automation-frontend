"use client";

import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { CalendarDays, ContactRound } from "lucide-react";
import Link from "next/link";
import { leadService } from "@/services/lead-service";
import { appointmentService } from "@/services/appointment-service";

export function SidebarActivity({ businessId, canViewLeads, canViewAppointments, onNavigate }: {
  businessId?: string; canViewLeads: boolean; canViewAppointments: boolean; onNavigate: () => void;
}) {
  const leads = useQuery({
    queryKey: ["leads", "list", "sidebar", businessId],
    queryFn: () => leadService.list({ page: 1, limit: 5, sortBy: "createdAt", sortOrder: "desc" }),
    enabled: Boolean(businessId && canViewLeads), staleTime: 60_000, retry: false,
  });
  const events = useQuery({
    queryKey: ["calendar-appointments", "sidebar", businessId],
    queryFn: async () => {
      const now = new Date();
      const result = await appointmentService.calendar({ dateFrom: format(now, "yyyy-MM-dd"), dateTo: format(addDays(now, 7), "yyyy-MM-dd"), view: "week" });
      return result.appointments
        .filter(event => new Date(event.startTime) >= now && new Date(event.startTime) <= addDays(now, 7) && !["CANCELLED", "COMPLETED", "NO_SHOW", "MISSED"].includes(event.status))
        .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)).slice(0, 3);
    },
    enabled: Boolean(businessId && canViewAppointments), staleTime: 60_000, refetchInterval: 60_000, retry: false,
  });
  if (!businessId) return null;
  const heading = "mb-2 px-2 text-xs font-medium text-muted-foreground";
  const link = "flex min-h-9 min-w-0 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return <>
    {canViewAppointments && <section className="mb-5" aria-label="Upcoming events">
      <h2 className={heading}>Upcoming events</h2>
      {events.isPending ? <p className="px-2 text-xs text-muted-foreground" role="status">Loading events…</p>
        : events.isError ? <button className={link} onClick={() => void events.refetch()}>Couldn’t load events · Retry</button>
        : events.data?.length ? <ul className="space-y-1">{events.data.map(event => <li key={event.id} className="flex min-w-0 gap-2 px-2 py-1.5">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0"><p className="truncate text-sm" title={event.title}>{event.title}</p><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: event.timezone }).format(new Date(event.startTime))}</p></div>
        </li>)}</ul> : <p className="px-2 text-xs text-muted-foreground">No events in the next 7 days.</p>}
      <Link href="/appointments/calendar" onClick={onNavigate} className={link}>View calendar</Link>
    </section>}
    {canViewLeads && <section className="mb-5" aria-label="Recent leads">
      <h2 className={heading}>Recent leads</h2>
      {leads.isPending ? <p className="px-2 text-xs text-muted-foreground" role="status">Loading leads…</p>
        : leads.isError ? <button className={link} onClick={() => void leads.refetch()}>Couldn’t load leads · Retry</button>
        : leads.data?.data.length ? <ul>{leads.data.data.map(lead => <li key={lead.id}><Link href={`/leads?lead=${encodeURIComponent(lead.id)}`} onClick={onNavigate} className={link} title={lead.fullName}><ContactRound className="size-4 shrink-0" /><span className="truncate">{lead.fullName}</span></Link></li>)}</ul>
        : <p className="px-2 text-xs text-muted-foreground">No leads yet.</p>}
      <Link href="/leads" onClick={onNavigate} className={link}>View all leads</Link>
    </section>}
  </>;
}
