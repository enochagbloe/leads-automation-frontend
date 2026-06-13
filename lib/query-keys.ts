export const queryKeys = {
  auth: { currentUser: ["auth", "current-user"] as const },
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
