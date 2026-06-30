export const queryKeys = {
  auth: { currentUser: ["auth", "current-user"] as const },
  invites: { detail: (token: string) => ["invites", token] as const },
  businesses: { all: ["businesses"] as const },
  plans: { all: ["plans"] as const },
  subscription: { current: ["subscription", "current"] as const },
  whatsapp: {
    all: ["whatsapp"] as const,
    status: (businessId: string) => ["whatsapp", "status", businessId] as const,
    health: (businessId: string) => ["whatsapp", "health", businessId] as const,
  },
  businessSetup: {
    all: ["business-setup-status"] as const,
    status: (businessId: string) => ["business-setup-status", businessId] as const,
  },
  businessProfile: {
    all: ["business-profile"] as const,
    detail: (businessId: string) => ["business-profile", businessId] as const,
  },
  businessServices: {
    all: ["business-services"] as const,
    list: (businessId: string, query: unknown) => ["business-services", "list", businessId, query] as const,
    detail: (businessId: string, serviceId: string) => ["business-services", "detail", businessId, serviceId] as const,
    summary: (businessId: string) => ["business-services", "summary", businessId] as const,
  },
  businessAvailability: {
    all: ["business-availability"] as const,
    detail: (businessId: string) => ["business-availability", businessId] as const,
    summary: (businessId: string) => ["business-availability", "summary", businessId] as const,
  },
  businessPolicies: {
    all: ["business-policies"] as const,
    list: (businessId: string, query: unknown) => ["business-policies", "list", businessId, query] as const,
    detail: (businessId: string, policyId: string) => ["business-policies", "detail", businessId, policyId] as const,
    summary: (businessId: string) => ["business-policies", "summary", businessId] as const,
  },
  businessKnowledge: {
    all: ["business-knowledge-preview"] as const,
    detail: (businessId: string) => ["business-knowledge-preview", businessId] as const,
  },
  calendarAppointments: {
    all: ["calendar-appointments"] as const,
    business: (businessId: string) => ["calendar-appointments", businessId] as const,
    calendar: (businessId: string, query: unknown) => ["calendar-appointments", businessId, query] as const,
  },
  businessAppointments: {
    all: ["business-appointments"] as const,
    business: (businessId: string) => ["business-appointments", businessId] as const,
    list: (businessId: string, query: unknown) => ["business-appointments", "list", businessId, query] as const,
    detail: (businessId: string, appointmentId: string) => ["business-appointments", "detail", businessId, appointmentId] as const,
    settings: (businessId: string) => ["business-appointments", "settings", businessId] as const,
    autoConfirmSettings: (businessId: string) => ["auto-confirm-settings", businessId] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    business: (businessId: string) => ["notifications", businessId] as const,
    list: (businessId: string, query: unknown) => ["notifications", "list", businessId, query] as const,
    counts: (businessId: string) => ["notifications", "counts", businessId] as const,
  },
  customerIssues: {
    all: ["customer-issues"] as const,
    business: (businessId: string) => ["customer-issues", businessId] as const,
    list: (businessId: string, query: unknown) => ["customer-issues", businessId, "list", query] as const,
    detail: (businessId: string, issueId: string) => ["customer-issues", businessId, "detail", issueId] as const,
  },
  businessLeads: {
    all: ["business-leads"] as const,
    list: (businessId: string, search: string) => ["business-leads", businessId, search] as const,
  },
  businessMembers: {
    all: ["business-members"] as const,
    list: (businessId: string) => ["business-members", businessId] as const,
  },
  leads: {
    all: ["leads"] as const,
    lists: ["leads", "list"] as const,
    list: (query: unknown) => ["leads", "list", query] as const,
    stats: ["leads", "stats"] as const,
    detail: (id: string) => ["leads", "detail", id] as const,
  },
  conversations: {
    all: ["conversations"] as const,
    lists: ["conversations", "list"] as const,
    list: (query: unknown) => ["conversations", "list", query] as const,
    stats: ["conversations", "stats"] as const,
    detail: (id: string) => ["conversations", "detail", id] as const,
  },
} as const;
