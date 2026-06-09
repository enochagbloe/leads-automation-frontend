export const queryKeys = {
  auth: { currentUser: ["auth", "current-user"] as const },
  businesses: { all: ["businesses"] as const },
  plans: { all: ["plans"] as const },
  subscription: { current: ["subscription", "current"] as const },
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
