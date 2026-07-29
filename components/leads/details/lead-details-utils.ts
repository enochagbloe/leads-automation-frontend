import type { CalendarAppointment } from "@/types/appointment";
import type { Conversation } from "@/types/conversation";
import type { CustomerIssue } from "@/types/customer-issue";
import type { Lead, LeadActivity, LeadStatus } from "@/types/lead";
import { getLeadActivityLabel, LEAD_STATUS_LABELS } from "@/lib/leads";

export const LEAD_STAGE_ORDER: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "APPOINTMENT_SCHEDULED", "WON"];

export function leadInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase() || "BR";
}

export function leadLocation(lead: Lead) {
  const value = lead.customFields?.location ?? lead.customFields?.preferredLocation ?? lead.customFields?.city;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function leadTitle(lead: Lead) {
  const subject = lead.customFields?.subject ?? lead.customFields?.enquirySubject ?? lead.customFields?.title;
  return typeof subject === "string" && subject.trim() ? subject.trim() : `${lead.fullName} enquiry`;
}

export function leadReference(lead: Lead) {
  const reference = lead.customFields?.reference ?? lead.customFields?.displayId ?? lead.customFields?.leadNumber;
  if (typeof reference === "string" && reference.trim()) return reference.trim();
  return `LEAD-${lead.id.slice(0, 6).toUpperCase()}`;
}

export function leadValue(lead: Lead) {
  const value = lead.customFields?.estimatedValue ?? lead.customFields?.value;
  if (typeof value === "number") return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export function assigneeName(lead: Lead) {
  return lead.assignedStaff ? `${lead.assignedStaff.user.firstName} ${lead.assignedStaff.user.lastName}` : "Unassigned";
}

export function createdByName(lead: Lead) {
  if (lead.createdBy) return `${lead.createdBy.firstName} ${lead.createdBy.lastName}`;
  if (lead.source === "WHATSAPP") return "WhatsApp inbound";
  if (lead.source === "WEBSITE") return "Website capture";
  return "System";
}

export function formatLeadDateTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatLeadShortDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GH", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function activityText(activity: LeadActivity) {
  const actor = activity.actor ? `${activity.actor.firstName} ${activity.actor.lastName}` : "System";
  if (activity.action === "LEAD_STATUS_CHANGED") {
    const to = typeof activity.metadata?.to === "string" ? activity.metadata.to : undefined;
    return {
      title: "Status changed",
      description: to ? `${actor} moved this lead to ${LEAD_STATUS_LABELS[to as LeadStatus] ?? to}.` : `${actor} changed the lead status.`,
    };
  }
  if (activity.action === "LEAD_ASSIGNED") {
    return { title: "Assignment updated", description: `${actor} updated the lead owner.` };
  }
  if (activity.action === "MESSAGE_CREATED" || activity.action === "MESSAGE_SENT") {
    return { title: "Customer conversation updated", description: "A message was added to the linked conversation." };
  }
  return { title: getLeadActivityLabel(activity.action), description: `${actor} ${getLeadActivityLabel(activity.action).toLowerCase()}.` };
}

export function upcomingAppointment(appointments: CalendarAppointment[]) {
  const now = Date.now();
  return [...appointments]
    .filter((appointment) => new Date(appointment.startTime).getTime() >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] ?? null;
}

export function leadAppointmentPreview(appointments: CalendarAppointment[]) {
  return upcomingAppointment(appointments) ?? [...appointments]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0] ?? null;
}

export function latestConversation(conversations: Conversation[]) {
  return [...conversations].sort((a, b) => new Date(b.lastMessageAt ?? b.updatedAt).getTime() - new Date(a.lastMessageAt ?? a.updatedAt).getTime())[0] ?? null;
}

export function openIssue(issues: CustomerIssue[]) {
  return issues.find((issue) => !["RESOLVED", "CLOSED"].includes(issue.status)) ?? null;
}
