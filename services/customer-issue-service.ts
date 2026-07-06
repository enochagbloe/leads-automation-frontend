import { apiDateFrom, apiDateTo } from "@/lib/date-query";
import { env } from "@/lib/env";
import { apiRequest } from "@/lib/api-client";
import { mockCustomerIssueService } from "@/services/mock-customer-issue-service";
import type { CustomerIssue, CustomerIssueLead, CustomerIssueListQuery, CustomerIssueListResponse, CustomerIssueMember, CustomerIssueMessage, CustomerIssueTimelineEvent, UpdateCustomerIssueStatusInput } from "@/types/customer-issue";

function queryString(query: CustomerIssueListQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "" || key === "tab") continue;
    if (key === "dateFrom") params.set(key, apiDateFrom(String(value)));
    else if (key === "dateTo") params.set(key, apiDateTo(String(value)));
    else params.set(key, String(value));
  }
  return params.toString();
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function memberName(value: Record<string, unknown>) {
  const direct = text(value.name);
  if (direct) return direct;
  const user = record(value.user);
  const firstName = text(user.firstName) ?? text(value.firstName);
  const lastName = text(user.lastName) ?? text(value.lastName);
  return [firstName, lastName].filter(Boolean).join(" ").trim() || undefined;
}

function normalizeMember(value: unknown): CustomerIssueMember | null {
  const source = record(value);
  const id = text(source.id);
  const name = memberName(source);
  if (!id && !name) return null;
  const user = record(source.user);
  return {
    id: id ?? text(source.membershipId) ?? text(source.userId) ?? name ?? "unknown-member",
    name: name ?? text(source.email) ?? text(user.email) ?? "Unknown member",
    email: text(source.email) ?? text(user.email),
    role: text(source.role),
    positionTitle: text(source.positionTitle) ?? null,
  };
}

function normalizeLead(value: unknown, issue: Record<string, unknown>): CustomerIssueLead | null {
  const source = record(value);
  const id = text(source.id) ?? text(issue.leadId);
  const name = text(source.name) ?? text(source.fullName) ?? text(issue.customerName) ?? text(issue.leadName);
  const phone = text(source.phone) ?? text(issue.customerPhone) ?? text(issue.leadPhone);
  if (!id && !name && !phone) return null;
  return { id: id ?? "unknown-lead", name: name ?? null, phone: phone ?? null };
}

function normalizeTimelineEvent(value: unknown): CustomerIssueTimelineEvent {
  const source = record(value);
  const metadata = record(source.metadata);
  return {
    ...source,
    id: text(source.id),
    type: text(source.type) ?? text(source.eventType),
    title: text(source.title),
    description: text(source.description),
    message: text(source.message),
    actorType: text(source.actorType),
    actorName: text(source.actorName),
    previousStatus: (text(source.previousStatus) ?? text(metadata.previousStatus) ?? null) as CustomerIssueTimelineEvent["previousStatus"],
    newStatus: (text(source.newStatus) ?? text(metadata.newStatus) ?? null) as CustomerIssueTimelineEvent["newStatus"],
    reopenSource: text(source.reopenSource) ?? text(metadata.reopenSource) ?? null,
    previousCategory: (text(source.previousCategory) ?? text(metadata.previousCategory) ?? null) as CustomerIssueTimelineEvent["previousCategory"],
    previousSeverity: (text(source.previousSeverity) ?? text(metadata.previousSeverity) ?? null) as CustomerIssueTimelineEvent["previousSeverity"],
    createdAt: text(source.createdAt) ?? text(source.timestamp) ?? null,
    timestamp: text(source.timestamp) ?? text(source.createdAt) ?? null,
    metadata: Object.keys(metadata).length ? metadata : null,
  };
}

function normalizeIssueMessage(value: unknown): CustomerIssueMessage {
  const source = record(value);
  const metadata = record(source.metadata);
  return {
    ...source,
    id: text(source.id) ?? text(source.messageId) ?? "unknown-message",
    direction: text(source.direction),
    body: text(source.body) ?? text(source.text) ?? text(source.content) ?? null,
    text: text(source.text) ?? null,
    content: text(source.content) ?? null,
    deliveryStatus: text(source.deliveryStatus) ?? text(source.status) ?? null,
    createdAt: text(source.createdAt) ?? null,
    metadata: Object.keys(metadata).length ? metadata : null,
  };
}

function normalizeIssue(value: unknown): CustomerIssue {
  const wrapped = record(value);
  const source = record(wrapped.issue ?? wrapped.customerIssue ?? wrapped.data ?? value);
  const lead = normalizeLead(source.lead ?? source.customer, source);
  const responsibleMember = normalizeMember(source.responsibleMember ?? source.responsibleStaff ?? source.assignedStaff);
  const clientOwner = normalizeMember(source.clientOwner ?? source.ownerMember ?? source.clientOwnerMember);
  const conversation = record(source.conversation);

  return {
    ...source,
    id: text(source.id) ?? "",
    businessId: text(source.businessId) ?? "",
    leadId: text(source.leadId) ?? lead?.id ?? null,
    conversationId: text(source.conversationId) ?? text(conversation.id) ?? null,
    type: (text(source.type) ?? "ISSUE") as CustomerIssue["type"],
    category: (text(source.category) ?? "OTHER") as CustomerIssue["category"],
    severity: (text(source.severity) ?? "MEDIUM") as CustomerIssue["severity"],
    summary: text(source.summary) ?? text(source.title) ?? "Customer issue",
    customerMessageExcerpt: text(source.customerMessageExcerpt) ?? text(source.messageExcerpt) ?? text(source.lastMessagePreview) ?? null,
    responsibleMember,
    clientOwner,
    lead,
    conversation: Object.keys(conversation).length ? {
      id: text(conversation.id) ?? text(source.conversationId) ?? "unknown-conversation",
      displayId: text(conversation.displayId) ?? null,
      title: text(conversation.title) ?? text(conversation.subject) ?? null,
      lastMessagePreview: text(conversation.lastMessagePreview) ?? null,
    } : null,
    routingReason: text(source.routingReason) ?? text(source.reason) ?? null,
    status: (text(source.status) ?? "OPEN") as CustomerIssue["status"],
    reopenCount: typeof source.reopenCount === "number" ? source.reopenCount : undefined,
    createdBy: (text(source.createdBy) ?? "AI") as CustomerIssue["createdBy"],
    createdAt: text(source.createdAt) ?? new Date().toISOString(),
    updatedAt: text(source.updatedAt) ?? text(source.createdAt) ?? new Date().toISOString(),
    resolvedAt: text(source.resolvedAt) ?? null,
    timelineEvents: Array.isArray(source.timelineEvents) ? source.timelineEvents.map(normalizeTimelineEvent) : undefined,
    issueMessages: Array.isArray(source.issueMessages) ? source.issueMessages.map(normalizeIssueMessage) : undefined,
  };
}

function normalizeListResponse(value: unknown): CustomerIssueListResponse {
  if (Array.isArray(value)) return { data: value.map(normalizeIssue) };
  const source = record(value);
  const dataSource = source.data;
  if (Array.isArray(dataSource)) return { ...source, data: dataSource.map(normalizeIssue) } as CustomerIssueListResponse;
  const nested = record(dataSource);
  const items = Array.isArray(source.items) ? source.items : Array.isArray(nested.items) ? nested.items : [];
  return {
    ...source,
    ...nested,
    data: items.map(normalizeIssue),
    pagination: record(source.pagination ?? nested.pagination) as CustomerIssueListResponse["pagination"],
  };
}

export const customerIssueService = {
  list: (query: CustomerIssueListQuery = {}) => env.useMockApi
    ? mockCustomerIssueService.list(query)
    : apiRequest<unknown>(`/business/customer-issues?${queryString(query)}`).then(normalizeListResponse),
  detail: (issueId: string) => env.useMockApi
    ? mockCustomerIssueService.detail(issueId)
    : apiRequest<unknown>(`/business/customer-issues/${issueId}`).then(normalizeIssue),
  updateStatus: ({ issueId, input }: { issueId: string; input: UpdateCustomerIssueStatusInput }) => env.useMockApi
    ? mockCustomerIssueService.updateStatus(issueId, input)
    : apiRequest<unknown>(`/business/customer-issues/${issueId}/status`, { method: "PATCH", body: JSON.stringify(input) }).then(normalizeIssue),
};
