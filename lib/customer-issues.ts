import type { CustomerIssueCategory, CustomerIssueSeverity, CustomerIssueStatus, CustomerIssueType } from "@/types/customer-issue";

export const CUSTOMER_ISSUE_STATUSES: CustomerIssueStatus[] = ["OPEN", "ACKNOWLEDGED", "RESOLVED", "CLOSED"];
export const CUSTOMER_ISSUE_SEVERITIES: CustomerIssueSeverity[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const CUSTOMER_ISSUE_CATEGORIES: CustomerIssueCategory[] = [
  "DELAY",
  "POOR_SERVICE",
  "QUALITY_ISSUE",
  "STAFF_BEHAVIOR",
  "MISCOMMUNICATION",
  "PAYMENT_ISSUE",
  "APPOINTMENT_ISSUE",
  "DELIVERY_OR_SITE_ISSUE",
  "MISSING_ITEM_OR_MISSING_WORK",
  "FOLLOW_UP_REQUIRED",
  "OTHER",
];

export const CUSTOMER_ISSUE_STATUS_LABELS: Record<CustomerIssueStatus, string> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const CUSTOMER_ISSUE_SEVERITY_LABELS: Record<CustomerIssueSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const CUSTOMER_ISSUE_CATEGORY_LABELS: Record<CustomerIssueCategory, string> = {
  DELAY: "Delay",
  POOR_SERVICE: "Poor Service",
  QUALITY_ISSUE: "Quality Issue",
  STAFF_BEHAVIOR: "Staff Behavior",
  MISCOMMUNICATION: "Miscommunication",
  PAYMENT_ISSUE: "Payment Issue",
  APPOINTMENT_ISSUE: "Appointment Issue",
  DELIVERY_OR_SITE_ISSUE: "Delivery / Site Issue",
  MISSING_ITEM_OR_MISSING_WORK: "Missing Item / Missing Work",
  FOLLOW_UP_REQUIRED: "Follow-up Required",
  OTHER: "Other",
};

export const CUSTOMER_ISSUE_TYPE_LABELS: Record<CustomerIssueType, string> = {
  COMPLAINT: "Complaint",
  ISSUE: "Issue",
  REQUEST_REQUIRES_INTERNAL_ACTION: "Internal Action",
};

export function customerIssueStatusTone(status: CustomerIssueStatus) {
  if (status === "OPEN") return "bg-warning/10 text-warning";
  if (status === "ACKNOWLEDGED") return "bg-info/10 text-info";
  if (status === "RESOLVED") return "bg-success/10 text-success";
  return "bg-muted text-muted-foreground";
}

export function customerIssueSeverityTone(severity: CustomerIssueSeverity) {
  if (severity === "URGENT") return "bg-destructive/10 text-destructive";
  if (severity === "HIGH") return "bg-warning/10 text-warning";
  if (severity === "MEDIUM") return "bg-info/10 text-info";
  return "bg-muted text-muted-foreground";
}

export function formatCustomerIssueTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
