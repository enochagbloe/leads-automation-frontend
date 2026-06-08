import type { LeadActivityAction, LeadSource, LeadStatus } from "@/types/lead";

export const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "APPOINTMENT_SCHEDULED", "WON", "LOST"];
export const LEAD_SOURCES: LeadSource[] = ["MANUAL", "WHATSAPP", "WEBSITE", "REFERRAL", "INSTAGRAM", "FACEBOOK", "OTHER"];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  QUALIFIED: "Qualified",
  APPOINTMENT_SCHEDULED: "Appointment scheduled",
  WON: "Won",
  LOST: "Lost",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  MANUAL: "Manual",
  WHATSAPP: "WhatsApp",
  WEBSITE: "Website",
  REFERRAL: "Referral",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  OTHER: "Other",
};

export const LEAD_ACTIVITY_LABELS: Record<LeadActivityAction, string> = {
  LEAD_CREATED: "Lead created",
  LEAD_UPDATED: "Lead updated",
  LEAD_ASSIGNED: "Lead assigned",
  LEAD_STATUS_CHANGED: "Status changed",
  LEAD_NOTE_UPDATED: "Notes updated",
  LEAD_DELETED: "Lead deleted",
};

export function leadStatusTone(status: LeadStatus) {
  if (status === "WON") return "bg-success/10 text-success";
  if (status === "LOST") return "bg-destructive/10 text-destructive";
  if (status === "QUALIFIED" || status === "APPOINTMENT_SCHEDULED") return "bg-secondary text-secondary-foreground";
  if (status === "INTERESTED") return "bg-accent/15 text-accent";
  return "bg-muted text-muted-foreground";
}

export function formatLeadDate(value: string) {
  return new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(new Date(value));
}
