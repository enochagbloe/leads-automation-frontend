export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api",
  useMockApi: process.env.NEXT_PUBLIC_USE_MOCK_API === "true",
} as const;
