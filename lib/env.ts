export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api",
  useMockApi: process.env.NEXT_PUBLIC_USE_MOCK_API === "true",
  metaAppId: process.env.NEXT_PUBLIC_META_APP_ID,
  metaWhatsAppConfigId: process.env.NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID,
  metaGraphVersion: process.env.NEXT_PUBLIC_META_GRAPH_VERSION ?? "v21.0",
} as const;
