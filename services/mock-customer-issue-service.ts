import type { CustomerIssue, CustomerIssueListQuery, CustomerIssueListResponse, CustomerIssueStatus, UpdateCustomerIssueStatusInput } from "@/types/customer-issue";

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
const now = new Date();

let issues: CustomerIssue[] = [
  {
    id: "issue_demo_1",
    businessId: "biz_demo",
    leadId: "lead_1",
    conversationId: "conv_1",
    type: "COMPLAINT",
    category: "APPOINTMENT_ISSUE",
    severity: "HIGH",
    summary: "Customer says the inspection team arrived late and did not call ahead.",
    customerMessageExcerpt: "I waited for almost an hour and nobody explained what was happening.",
    responsibleMembershipId: "member_demo",
    responsibleMember: { id: "member_demo", name: "Amara Mensah", email: "demo@bizreply.ai", role: "BUSINESS_OWNER" },
    lead: { id: "lead_1", name: "Kwame Mensah", phone: "+233241234567" },
    conversation: { id: "conv_1", displayId: "CONV-001000", title: "Site inspection follow-up", lastMessagePreview: "I waited for almost an hour..." },
    routingReason: "AI detected an appointment complaint and routed it to the business owner.",
    status: "OPEN",
    createdBy: "AI",
    createdAt: new Date(now.getTime() - 1000 * 60 * 42).toISOString(),
    updatedAt: new Date(now.getTime() - 1000 * 60 * 42).toISOString(),
    resolvedAt: null,
  },
  {
    id: "issue_demo_2",
    businessId: "biz_demo",
    leadId: "lead_2",
    conversationId: "conv_2",
    type: "REQUEST_REQUIRES_INTERNAL_ACTION",
    category: "FOLLOW_UP_REQUIRED",
    severity: "MEDIUM",
    summary: "Customer needs a manager to confirm revised pricing before proceeding.",
    customerMessageExcerpt: "Please let someone senior confirm the new quote before I make payment.",
    suggestedResponsibleMembershipId: "member_demo",
    responsibleMember: null,
    lead: { id: "lead_2", name: "Akosua Owusu", phone: "+233271112233" },
    conversation: { id: "conv_2", displayId: "CONV-001001", title: "Pricing clarification", lastMessagePreview: "Please let someone senior confirm..." },
    routingReason: "AI found a pricing concern that needs human confirmation.",
    status: "RESOLVED",
    createdBy: "AI",
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(),
    resolvedAt: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
    reopenCount: 1,
    timelineEvents: [
      {
        id: "event_demo_1",
        type: "CUSTOMER_ISSUE_REOPENED",
        previousStatus: "RESOLVED",
        newStatus: "REOPENED",
        reopenSource: "MANAGER_ACTION",
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
      },
    ],
    issueMessages: [
      {
        id: "msg_demo_resolution",
        direction: "OUTBOUND",
        body: "Thanks for raising this. A manager has reviewed the pricing and confirmed the revised quote.",
        deliveryStatus: "PENDING",
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
      },
    ],
  },
];

const allowedTransitions: Record<CustomerIssueStatus, CustomerIssueStatus[]> = {
  OPEN: ["ACKNOWLEDGED", "RESOLVED", "CLOSED"],
  ACKNOWLEDGED: ["RESOLVED", "CLOSED"],
  REOPENED: ["ACKNOWLEDGED", "RESOLVED", "CLOSED"],
  RESOLVED: ["REOPENED", "CLOSED"],
  CLOSED: [],
};

function filterIssues(query: CustomerIssueListQuery) {
  const search = query.search?.trim().toLowerCase();
  return issues
    .filter((issue) => !query.status || issue.status === query.status)
    .filter((issue) => !query.severity || issue.severity === query.severity)
    .filter((issue) => !query.category || issue.category === query.category)
    .filter((issue) => query.tab !== "assigned-to-me" || issue.responsibleMembershipId === "member_demo")
    .filter((issue) => query.tab !== "unassigned" || !issue.responsibleMembershipId)
    .filter((issue) => query.tab !== "open" || ["OPEN", "ACKNOWLEDGED", "REOPENED"].includes(issue.status))
    .filter((issue) => query.tab !== "resolved" || ["RESOLVED", "CLOSED"].includes(issue.status))
    .filter((issue) => {
      if (!search) return true;
      return [
        issue.summary,
        issue.customerMessageExcerpt,
        issue.lead?.name,
        issue.lead?.phone,
        issue.category,
        issue.subcategory,
        issue.conversation?.displayId,
      ].some((value) => value?.toLowerCase().includes(search));
    });
}

export const mockCustomerIssueService = {
  async list(query: CustomerIssueListQuery = {}): Promise<CustomerIssueListResponse> {
    await delay();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filtered = filterIssues(query);
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / limit)) },
    };
  },
  async detail(issueId: string): Promise<CustomerIssue> {
    await delay(250);
    const issue = issues.find((item) => item.id === issueId);
    if (!issue) throw new Error("Issue not found.");
    return issue;
  },
  async updateStatus(issueId: string, input: UpdateCustomerIssueStatusInput): Promise<CustomerIssue> {
    await delay(300);
    let updated: CustomerIssue | undefined;
    issues = issues.map((issue) => {
      if (issue.id !== issueId) return issue;
      if (!allowedTransitions[issue.status].includes(input.status)) return issue;
      updated = {
        ...issue,
        status: input.status as CustomerIssueStatus,
        reopenCount: input.status === "REOPENED" ? (issue.reopenCount ?? 0) + 1 : issue.reopenCount,
        updatedAt: new Date().toISOString(),
        resolvedAt: input.status === "RESOLVED" || input.status === "CLOSED" ? new Date().toISOString() : input.status === "REOPENED" ? null : issue.resolvedAt,
      };
      return updated;
    });
    if (!updated) throw new Error("Issue not found.");
    return updated;
  },
};
