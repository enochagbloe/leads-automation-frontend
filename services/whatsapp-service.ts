import { apiRequest } from "@/lib/api-client";
import type { CompleteWhatsAppConnectionInput, StartWhatsAppConnectionInput, WhatsAppHealth, WhatsAppStatus } from "@/types/whatsapp";

export const whatsappService = {
  status: () => apiRequest<WhatsAppStatus>("/business/whatsapp/status"),
  health: () => apiRequest<WhatsAppHealth>("/business/whatsapp/health"),
  start: (input: StartWhatsAppConnectionInput) => apiRequest<WhatsAppStatus>("/business/whatsapp/connect/start", { method: "POST", body: JSON.stringify(input) }),
  complete: (input: CompleteWhatsAppConnectionInput) => apiRequest<WhatsAppStatus>("/business/whatsapp/connect/complete", { method: "POST", body: JSON.stringify(input) }),
  deactivate: (reason?: string) => apiRequest<WhatsAppStatus>("/business/whatsapp/deactivate", { method: "POST", body: JSON.stringify({ reason: reason || undefined }) }),
  startChange: () => apiRequest<WhatsAppStatus>("/business/whatsapp/change/start", { method: "POST" }),
};
