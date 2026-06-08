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
} as const;
