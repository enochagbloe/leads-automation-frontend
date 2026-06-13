export type WhatsAppConnectionStatus = "NOT_CONNECTED" | "CONNECTING" | "CONNECTED" | "DEACTIVATED" | "ERROR";
export type WhatsAppProvider = "MOCK_WHATSAPP" | "META_WHATSAPP";

export interface WhatsAppStatus {
  status: WhatsAppConnectionStatus;
  provider?: WhatsAppProvider;
  displayPhoneNumber?: string | null;
  phoneNumberId?: string | null;
  wabaId?: string | null;
  connectedAt?: string | null;
  deactivatedAt?: string | null;
  automationEnabled: boolean;
  canSendMessages: boolean;
  lastHealthCheckAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  message?: string;
  nextStep?: string | null;
}

export interface WhatsAppHealth {
  status: WhatsAppConnectionStatus;
  canReceiveMessages: boolean;
  canSendMessages: boolean;
  automationEnabled: boolean;
  lastInboundMessageAt?: string | null;
  lastOutboundMessageAt?: string | null;
  lastHealthCheckAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
}

export interface StartWhatsAppConnectionInput {
  provider: WhatsAppProvider;
  displayPhoneNumber?: string;
}

export interface CompleteWhatsAppConnectionInput {
  provider: "META_WHATSAPP";
  phoneNumberId: string;
  displayPhoneNumber?: string;
  wabaId: string;
  businessAccountId?: string;
  authorizationCode: string;
}
