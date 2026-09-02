"use client";

import {
  AlertTriangle,
  ArrowRightLeft,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppButton } from "@/components/app-button";
import { AppErrorState } from "@/components/app-error-state";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { LoadingPage } from "@/components/states/loading-states";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useDeactivateWhatsAppConnection,
  useCompleteWhatsAppConnection,
  useStartWhatsAppConnection,
  useStartWhatsAppNumberChange,
  useWhatsAppStatus,
} from "@/hooks/use-whatsapp";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { env } from "@/lib/env";
import { systemNotify } from "@/lib/system-notifications";
import { cn } from "@/lib/utils";
import type { WhatsAppConnectionStatus, WhatsAppProvider, WhatsAppStatus } from "@/types/whatsapp";

declare global {
  interface Window {
    FB?: {
      init: (config: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string }; status?: string }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const COUNTRY_CODES = [
  { value: "+233", label: "Ghana +233" },
  { value: "+234", label: "Nigeria +234" },
  { value: "+254", label: "Kenya +254" },
  { value: "+27", label: "South Africa +27" },
  { value: "+1", label: "United States +1" },
  { value: "+44", label: "United Kingdom +44" },
];

const CONNECTING_STEPS = [
  "Connecting your number...",
  "Sit tight, this takes a couple of seconds...",
  "Securing your WhatsApp workspace...",
  "Almost done...",
];

const DISCONNECTING_STEPS = [
  "Disconnecting your number...",
  "Preserving your conversation history...",
  "Turning off WhatsApp delivery...",
  "Almost done...",
];

const STATUS_LABELS: Record<WhatsAppConnectionStatus, string> = {
  NOT_CONNECTED: "Not connected",
  CONNECTING: "Connection pending",
  CONNECTED: "Connected",
  DEACTIVATED: "Deactivated",
  ERROR: "Needs attention",
};

type ConnectionStage =
  | "starting"
  | "authorizing"
  | "completing"
  | "refreshing"
  | "disconnecting";

interface MetaAuthorizationResult {
  authorizationCode: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber?: string;
  businessAccountId?: string;
  metadata: Record<string, unknown>;
}

function connectionDiagnostic(stage: string, details: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "production" && !env.whatsappDebug) return;
  console.info("[BizReply WhatsApp]", stage, details);
}

function compactError(error: unknown) {
  if (!(error instanceof ApiError)) return getApiErrorMessage(error);
  const messages: Record<string, string> = {
    WHATSAPP_ALREADY_CONNECTED: "This business already has an active WhatsApp number.",
    WHATSAPP_NUMBER_LIMIT_REACHED: "Your current plan allows one WhatsApp number per business.",
    WHATSAPP_PROVIDER_CONFIG_MISSING: "Provider setup is missing. Please contact support.",
    WHATSAPP_PROVIDER_UNAVAILABLE: "WhatsApp is temporarily unavailable. Please try again shortly.",
    FORBIDDEN: "You do not have permission to manage WhatsApp.",
    BUSINESS_ACCESS_DENIED: "You do not have access to this business.",
  };
  return messages[error.code] ?? error.message;
}

function normalizeLocalPhone(value: string) {
  return value.replace(/[^\d]/g, "").replace(/^0+/, "");
}

function providerForEnvironment(): WhatsAppProvider {
  return "META_WHATSAPP";
}

function loadMetaSdk() {
  if (!env.metaAppId || !env.metaWhatsAppConfigId) {
    return Promise.reject(new Error("Meta authorization is not configured for this frontend."));
  }
  if (typeof window === "undefined") return Promise.reject(new Error("Meta authorization can only run in the browser."));
  if (window.FB) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById("facebook-jssdk");
    const timeoutId = window.setTimeout(() => reject(new Error("Meta authorization took too long to load.")), 15000);

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: env.metaAppId!,
        cookie: true,
        xfbml: false,
        version: env.metaGraphVersion,
      });
      window.clearTimeout(timeoutId);
      resolve();
    };

    if (existingScript) {
      const intervalId = window.setInterval(() => {
        if (!window.FB) return;
        window.clearInterval(intervalId);
        window.clearTimeout(timeoutId);
        resolve();
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error("Could not load Meta authorization. Check your network and try again."));
    };
    document.body.appendChild(script);
  });
}

function parseQueryPayload(value: string) {
  if (!value.includes("=")) return null;
  const normalized = value.startsWith("?") || value.startsWith("#") ? value.slice(1) : value;
  const params = new URLSearchParams(normalized);
  const entries = Array.from(params.entries());
  if (!entries.length) return null;
  return Object.fromEntries(entries);
}

function stringPayloadVariants(value: string) {
  const variants = new Set([value]);
  let current = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeURIComponent(current.replace(/\+/g, "%20"));
      if (decoded === current) break;
      variants.add(decoded);
      current = decoded;
    } catch {
      break;
    }
  }
  return [...variants];
}

function keySnapshots(value: unknown, path = "event.data", depth = 0): Array<{ path: string; keys: string[] }> {
  if (depth > 5) return [];
  if (Array.isArray(value)) {
    return value.slice(0, 10).flatMap((item, index) => keySnapshots(item, `${path}[${index}]`, depth + 1));
  }
  const object = objectValue(value);
  if (!object) return [];
  const keys = Object.keys(object).sort().slice(0, 100);
  return [
    { path, keys },
    ...keys.flatMap((key) => keySnapshots(object[key], `${path}.${key}`, depth + 1)),
  ].slice(0, 50);
}

function inspectMessageData(data: unknown) {
  const dataType = typeof data;
  const isJsonString = typeof data === "string";
  const stringData = typeof data === "string" ? data : "";
  let jsonParseSucceeded = false;
  let queryStringParseSucceeded = false;
  let parsed: unknown = data;

  if (isJsonString) {
    try {
      parsed = JSON.parse(data);
      jsonParseSucceeded = true;
    } catch {
      parsed = parseQueryPayload(data);
      queryStringParseSucceeded = Boolean(parsed);
    }
  }

  const payload = objectValue(parsed);
  const nestedData = objectValue(payload?.data);
  const dataObject = objectValue(data);
  const snapshots = keySnapshots(parsed);
  return {
    payload,
    stringData,
    dataType,
    isJsonString,
    jsonParseSucceeded,
    queryStringParseSucceeded,
    eventDataKeys: dataObject ? Object.keys(dataObject).sort() : [],
    topLevelKeys: payload ? Object.keys(payload).sort() : [],
    nestedDataKeys: nestedData ? Object.keys(nestedData).sort() : [],
    keySnapshots: snapshots.slice(0, 50),
    hasEmbeddedSignupSubstring: stringData.includes("WA_EMBEDDED_SIGNUP"),
    hasFinishSubstring: stringData.includes("FINISH"),
    hasPhoneNumberIdSubstring: stringData.includes("phone_number_id") || stringData.includes("phoneNumberId"),
    hasWabaIdSubstring: stringData.includes("waba_id") || stringData.includes("wabaId") || stringData.includes("whatsapp_business_account_id") || stringData.includes("whatsappBusinessAccountId"),
  };
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}

function findNestedString(value: unknown, keys: string[], depth = 0): string {
  if (depth > 5) return "";
  if (typeof value === "string") {
    for (const variant of stringPayloadVariants(value)) {
      try {
        const parsed = JSON.parse(variant) as unknown;
        if (parsed && typeof parsed === "object") {
          const found = findNestedString(parsed, keys, depth + 1);
          if (found) return found;
        }
      } catch {
        // Meta can also wrap session data as a URL-encoded query string.
      }
      const queryPayload = parseQueryPayload(variant);
      if (queryPayload) {
        const found = findNestedString(queryPayload, keys, depth + 1);
        if (found) return found;
      }
    }
    return "";
  }
  if (Array.isArray(value)) {
    for (const nested of value) {
      const found = findNestedString(nested, keys, depth + 1);
      if (found) return found;
    }
    return "";
  }
  const object = objectValue(value);
  if (!object) return "";

  for (const key of keys) {
    const found = firstString(object[key]);
    if (found) return found;
  }

  for (const nested of Object.values(object)) {
    const found = findNestedString(nested, keys, depth + 1);
    if (found) return found;
  }
  return "";
}

function hasNestedValue(value: unknown, expected: string, depth = 0): boolean {
  if (depth > 5) return false;
  if (typeof value === "string") return value === expected;
  if (Array.isArray(value)) return value.some((nested) => hasNestedValue(nested, expected, depth + 1));
  const object = objectValue(value);
  if (!object) return false;
  return Object.values(object).some((nested) => hasNestedValue(nested, expected, depth + 1));
}

function hasNestedKey(value: unknown, keys: string[], depth = 0): boolean {
  if (depth > 5) return false;
  if (Array.isArray(value)) return value.some((nested) => hasNestedKey(nested, keys, depth + 1));
  const object = objectValue(value);
  if (!object) return false;
  if (keys.some((key) => Object.prototype.hasOwnProperty.call(object, key))) return true;
  return Object.values(object).some((nested) => hasNestedKey(nested, keys, depth + 1));
}

function findStringPayloadValue(source: string, keys: string[]) {
  for (const variant of stringPayloadVariants(source)) {
    for (const key of keys) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = variant.match(new RegExp(`["']?${escapedKey}["']?\\s*[:=]\\s*["']([^"'&\\s,}]+)["']`, "i"));
      if (match?.[1]) return match[1];
    }
  }
  return "";
}

function metaPayloadType(payload: Record<string, unknown> | null) {
  return findNestedString(payload, ["type", "messageType", "event_type"]);
}

function metaPayloadEvent(payload: Record<string, unknown> | null) {
  return findNestedString(payload, ["event", "name", "status"]).toUpperCase();
}

function isExpectedMetaSessionInfoOrigin(origin: string) {
  return origin === "https://www.facebook.com";
}

function metaCallbackError({
  hasLoginCallback,
  hasAuthorizationCode,
  hasFinishEvent,
  hasPhoneNumberId,
  hasWabaId,
}: {
  hasLoginCallback: boolean;
  hasAuthorizationCode: boolean;
  hasFinishEvent: boolean;
  hasPhoneNumberId: boolean;
  hasWabaId: boolean;
}) {
  if (!hasLoginCallback) return "Meta authorization did not return a login callback. Please retry the connection.";
  if (!hasAuthorizationCode) return "Meta authorization completed, but no authorization code was returned. Please retry the connection.";
  if (!hasFinishEvent) return "Meta authorization completed, but WhatsApp account information was not returned. Please retry the connection.";
  if (!hasPhoneNumberId) return "Meta authorization completed, but the WhatsApp phone number ID was missing. Please retry the connection.";
  if (!hasWabaId) return "Meta authorization completed, but the WhatsApp business account ID was missing. Please retry the connection.";
  return "Meta authorization timed out. Please retry the connection.";
}

function isHttpsPage() {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:";
}

async function runMetaAuthorization(): Promise<MetaAuthorizationResult> {
  await loadMetaSdk();
  const facebook = window.FB;
  if (!facebook || !env.metaWhatsAppConfigId) throw new Error("Meta authorization is not available.");
  if (!isHttpsPage()) {
    connectionDiagnostic("META_AUTH_FAILURE", { reason: "http_page" });
    throw new Error("Meta authorization requires HTTPS. Open this page from your HTTPS staging or production URL, then retry the connection.");
  }

  return new Promise<MetaAuthorizationResult>((resolve, reject) => {
    let authorizationCode = "";
    let phoneNumberId = "";
    let wabaId = "";
    let displayPhoneNumber: string | undefined;
    let businessAccountId: string | undefined;
    let metadata: Record<string, unknown> = {};
    let settled = false;
    let hasLoginCallback = false;
    let hasFinishEvent = false;

    const timeoutId = window.setTimeout(() => {
      fail(metaCallbackError({
        hasLoginCallback,
        hasAuthorizationCode: Boolean(authorizationCode),
        hasFinishEvent,
        hasPhoneNumberId: Boolean(phoneNumberId),
        hasWabaId: Boolean(wabaId),
      }));
    }, 90000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", handleMessage);
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };
    const finishIfReady = () => {
      if (settled || !authorizationCode) return;
      if (!phoneNumberId || !wabaId) return;
      connectionDiagnostic("META_READY_TO_COMPLETE", {
        hasAuthorizationCode: true,
        hasPhoneNumberId: true,
        hasWabaId: true,
        hasDisplayPhoneNumber: Boolean(displayPhoneNumber),
        hasBusinessAccountId: Boolean(businessAccountId),
      });
      settled = true;
      cleanup();
      resolve({ authorizationCode, phoneNumberId, wabaId, displayPhoneNumber, businessAccountId, metadata });
    };

    function handleMessage(event: MessageEvent) {
      const isExpectedMetaOrigin = isExpectedMetaSessionInfoOrigin(event.origin);
      connectionDiagnostic("MESSAGE_EVENT_RECEIVED", {
        origin: event.origin,
        dataType: typeof event.data,
        isExpectedMetaOrigin,
      });

      if (!isExpectedMetaOrigin) return;

      const inspection = inspectMessageData(event.data);
      const payload = inspection.payload;
      const payloadType = metaPayloadType(payload);
      const payloadEvent = metaPayloadEvent(payload);
      const stringPayloadType = inspection.hasEmbeddedSignupSubstring ? "WA_EMBEDDED_SIGNUP" : "";
      const stringPayloadEvent = inspection.hasFinishSubstring ? "FINISH" : "";
      const effectivePayloadType = payloadType || stringPayloadType;
      const effectivePayloadEvent = payloadEvent || stringPayloadEvent;
      const safePhoneNumberId = findNestedString(payload, ["phone_number_id", "phoneNumberId"]) || findStringPayloadValue(inspection.stringData, ["phone_number_id", "phoneNumberId"]);
      const safeWabaId = findNestedString(payload, ["waba_id", "wabaId", "whatsapp_business_account_id", "whatsappBusinessAccountId"]) || findStringPayloadValue(inspection.stringData, ["waba_id", "wabaId", "whatsapp_business_account_id", "whatsappBusinessAccountId"]);
      const hasEmbeddedSignupMarker = hasNestedValue(payload, "WA_EMBEDDED_SIGNUP") || inspection.hasEmbeddedSignupSubstring;
      const isEmbeddedSignupMessage = effectivePayloadType.toUpperCase() === "WA_EMBEDDED_SIGNUP" || hasEmbeddedSignupMarker;

      connectionDiagnostic("META_SESSION_INFO_MESSAGE", {
        origin: event.origin,
        dataType: inspection.dataType,
        isJsonString: inspection.isJsonString,
        jsonParseSucceeded: inspection.jsonParseSucceeded,
        topLevelKeys: inspection.topLevelKeys,
        dataKeys: inspection.nestedDataKeys,
        type: effectivePayloadType || null,
        event: effectivePayloadEvent || null,
        hasPhoneNumberId: hasNestedKey(payload, ["phone_number_id", "phoneNumberId"])
          || inspection.hasPhoneNumberIdSubstring,
        hasWabaId: hasNestedKey(payload, ["waba_id", "wabaId", "whatsapp_business_account_id", "whatsappBusinessAccountId"])
          || inspection.hasWabaIdSubstring,
      });

      if (!isEmbeddedSignupMessage) return;

      metadata = { ...metadata, embeddedSignupEvent: effectivePayloadEvent || undefined, embeddedSignupVersion: payload?.version };
      if (effectivePayloadEvent === "FINISH") {
        hasFinishEvent = true;
        phoneNumberId = safePhoneNumberId;
        wabaId = safeWabaId;
        displayPhoneNumber = findNestedString(payload, ["display_phone_number", "displayPhoneNumber", "phone_number", "phoneNumber"])
          || findStringPayloadValue(inspection.stringData, ["display_phone_number", "displayPhoneNumber", "phone_number", "phoneNumber"]);
        businessAccountId = findNestedString(payload, ["business_id", "businessAccountId"]) || findStringPayloadValue(inspection.stringData, ["business_id", "businessAccountId"]);
        metadata = {
          ...metadata,
          hasFinishEvent,
          hasPhoneNumberId: Boolean(phoneNumberId),
          hasWabaId: Boolean(wabaId),
          hasBusinessAccountId: Boolean(businessAccountId),
          hasDisplayPhoneNumber: Boolean(displayPhoneNumber),
        };
        connectionDiagnostic("META_FINISH_RECEIVED", {
          hasPhoneNumberId: Boolean(phoneNumberId),
          hasWabaId: Boolean(wabaId),
          hasDisplayPhoneNumber: Boolean(displayPhoneNumber),
          hasBusinessAccountId: Boolean(businessAccountId),
        });
        finishIfReady();
      }
      if (effectivePayloadEvent === "CANCEL") fail("Meta authorization was cancelled before the number was connected.");
      if (effectivePayloadEvent === "ERROR") fail("Meta authorization failed. Please try again.");
    }

    window.addEventListener("message", handleMessage);
    try {
      facebook.login((response) => {
        hasLoginCallback = true;
        authorizationCode = response.authResponse?.code ?? "";
        connectionDiagnostic("FB_LOGIN_CALLBACK_RECEIVED", {
          hasAuthorizationCode: Boolean(authorizationCode),
          status: response.status ?? null,
          hasAuthResponse: Boolean(response.authResponse),
        });
        if (!authorizationCode) {
          fail(response.status === "not_authorized" ? "Meta authorization was not approved." : "Meta authorization was closed before completion.");
          return;
        }
        finishIfReady();
      }, {
        config_id: env.metaWhatsAppConfigId,
        response_type: "code",
        override_default_response_type: true,
        extras: { sessionInfoVersion: 3 },
      });
    } catch (error) {
      fail(error instanceof Error ? error.message : "Meta authorization could not be started. Please try again.");
    }
  });
}

function WhatsAppMark({ connected, busy }: { connected?: boolean; busy?: boolean }) {
  return (
    <div className="relative mx-auto grid size-24 place-items-center rounded-[2rem] bg-secondary text-primary shadow-[0_18px_60px_rgba(7,94,69,0.16)]">
      <MessageCircle className="size-11" strokeWidth={1.8} />
      <span className={cn("absolute right-4 top-4 size-3 rounded-full ring-4 ring-card", connected ? "bg-success" : busy ? "animate-pulse bg-warning" : "bg-muted-foreground")} />
    </div>
  );
}

function ConnectionLoadingState({ active, mode = "connecting", stage }: { active: boolean; mode?: "connecting" | "disconnecting"; stage?: ConnectionStage | null }) {
  const [step, setStep] = useState(0);
  const stageSteps: Record<ConnectionStage, string> = {
    starting: "Starting WhatsApp connection...",
    authorizing: "Waiting for Meta authorization...",
    completing: "Almost there... connecting your number",
    refreshing: "Checking connection status...",
    disconnecting: "Disconnecting your number...",
  };
  const steps = mode === "disconnecting" ? DISCONNECTING_STEPS : CONNECTING_STEPS;
  const title = stage ? stageSteps[stage] : steps[active ? step : 0];

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => {
      setStep((value) => Math.min(value + 1, steps.length - 1));
    }, 1200);
    return () => window.clearInterval(interval);
  }, [active, steps.length]);

  return (
    <div className="mx-auto grid min-h-[420px] max-w-md place-items-center text-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{mode === "disconnecting" ? "Disconnecting" : "Connecting"}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {mode === "disconnecting"
            ? "Please keep this page open. Your leads, conversations, and messages will stay available."
            : "Please keep this page open. We are preparing your WhatsApp workspace."}
        </p>
        <div className="mx-auto mt-7 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

function ConnectedState({
  status,
  canManage,
  onChangeNumber,
  onDisconnect,
  changing,
  disconnecting,
}: {
  status: WhatsAppStatus;
  canManage: boolean;
  onChangeNumber: () => void;
  onDisconnect: () => void;
  changing: boolean;
  disconnecting: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <WhatsAppMark connected />
      <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-success">We are set</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">WhatsApp is connected</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Customer messages can now land inside BizReply for this business.</p>
      <p className="mt-7 text-sm text-muted-foreground">Connected number: <span className="font-bold text-foreground">{status.displayPhoneNumber ?? "Number connected"}</span></p>
      {canManage && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <AppButton variant="outline" loading={changing} loadingText="Preparing" onClick={onChangeNumber}><ArrowRightLeft className="size-4" />Change number</AppButton>
          <AppButton variant="ghost" loading={disconnecting} loadingText="Disconnecting" onClick={onDisconnect}>Disconnect number</AppButton>
        </div>
      )}
    </div>
  );
}

function ConnectAccountFlow({ businessName, status, businessId, canManage, onRefresh }: { businessName: string; status: WhatsAppStatus; businessId: string; canManage: boolean; onRefresh: () => Promise<unknown> }) {
  const start = useStartWhatsAppConnection(businessId);
  const complete = useCompleteWhatsAppConnection(businessId);
  const change = useStartWhatsAppNumberChange(businessId);
  const deactivate = useDeactivateWhatsAppConnection(businessId);
  const [showForm, setShowForm] = useState(status.status === "CONNECTING" || status.status === "ERROR");
  const [countryCode, setCountryCode] = useState("+233");
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);
  const [stage, setStage] = useState<ConnectionStage | null>(null);
  const processTimeoutRef = useRef<number | null>(null);
  const stageRef = useRef<ConnectionStage | null>(null);
  const localPhone = normalizeLocalPhone(phone);
  const fullPhone = `${countryCode}${localPhone}`;
  const connecting = Boolean(stage) || start.isPending || complete.isPending || change.isPending;
  const disconnecting = deactivate.isPending;
  const connected = status.status === "CONNECTED";
  const hasPendingConnection = status.status === "CONNECTING";
  const canSubmitConnection = hasPendingConnection || Boolean(localPhone);

  const clearProcessTimeout = useCallback(() => {
    if (!processTimeoutRef.current) return;
    window.clearTimeout(processTimeoutRef.current);
    processTimeoutRef.current = null;
  }, []);

  const failConnection = useCallback((message: string) => {
    clearProcessTimeout();
    stageRef.current = null;
    setStage(null);
    setErrorMessage(message);
    setRefreshCountdown(4);
  }, [clearProcessTimeout]);

  const beginStage = useCallback((nextStage: ConnectionStage) => {
    clearProcessTimeout();
    stageRef.current = nextStage;
    setStage(nextStage);
    processTimeoutRef.current = window.setTimeout(() => {
      failConnection("The WhatsApp connection process took too long. Please try again.");
    }, 120000);
  }, [clearProcessTimeout, failConnection]);

  useEffect(() => {
    if (refreshCountdown === null) return;
    if (refreshCountdown <= 0) {
      connectionDiagnostic("STATUS_REFETCH", { businessId, reason: "error-countdown" });
      void onRefresh().finally(() => {
        setRefreshCountdown(null);
      });
      return;
    }
    const timeout = window.setTimeout(() => setRefreshCountdown((value) => (value ?? 1) - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [businessId, onRefresh, refreshCountdown]);

  useEffect(() => () => clearProcessTimeout(), [clearProcessTimeout]);

  const finishMetaConnection = useCallback(async (displayPhoneNumber?: string) => {
    beginStage("authorizing");
    connectionDiagnostic("META_AUTH_STARTED", { businessId, hasMetaAppId: Boolean(env.metaAppId), hasConfigId: Boolean(env.metaWhatsAppConfigId) });
    const meta = await runMetaAuthorization();
    const nextDisplayPhoneNumber = meta.displayPhoneNumber ?? displayPhoneNumber;
    connectionDiagnostic("META_AUTH_SUCCESS", {
      businessId,
      hasPhoneNumberId: Boolean(meta.phoneNumberId),
      hasWabaId: Boolean(meta.wabaId),
      hasBusinessAccountId: Boolean(meta.businessAccountId),
      hasDisplayPhoneNumber: Boolean(nextDisplayPhoneNumber),
    });

    beginStage("completing");
    connectionDiagnostic("CONNECTION_COMPLETE_REQUEST", {
      businessId,
      hasPhoneNumberId: Boolean(meta.phoneNumberId),
      hasWabaId: Boolean(meta.wabaId),
      hasBusinessAccountId: Boolean(meta.businessAccountId),
      hasDisplayPhoneNumber: Boolean(nextDisplayPhoneNumber),
    });
    await complete.mutateAsync({
      provider: "META_WHATSAPP",
      phoneNumberId: meta.phoneNumberId,
      displayPhoneNumber: nextDisplayPhoneNumber,
      wabaId: meta.wabaId,
      businessAccountId: meta.businessAccountId,
      authorizationCode: meta.authorizationCode,
      metadata: meta.metadata,
    });
    connectionDiagnostic("CONNECTION_COMPLETE_SUCCESS", { businessId, status: "CONNECTED" });

    beginStage("refreshing");
    connectionDiagnostic("STATUS_REFETCH", { businessId, reason: "after-complete" });
    await onRefresh();
    clearProcessTimeout();
    stageRef.current = null;
    setStage(null);
    setShowForm(false);
    systemNotify.success("WhatsApp number connected", { description: "Customer messages can now flow into BizReply." });
  }, [beginStage, businessId, clearProcessTimeout, complete, onRefresh]);

  const connect = useCallback(async () => {
    setErrorMessage(null);
    setRefreshCountdown(null);
    try {
      if (hasPendingConnection) {
        await finishMetaConnection(localPhone ? fullPhone : status.displayPhoneNumber ?? undefined);
        return;
      }

      beginStage("starting");
      connectionDiagnostic("CONNECTION_START_REQUEST", { businessId, provider: providerForEnvironment(), hasDisplayPhoneNumber: Boolean(fullPhone) });
      await start.mutateAsync({ provider: providerForEnvironment(), displayPhoneNumber: fullPhone });
      connectionDiagnostic("CONNECTION_START_SUCCESS", { businessId, status: "CONNECTING" });
      connectionDiagnostic("STATUS_REFETCH", { businessId, reason: "after-start" });
      await onRefresh();
      await finishMetaConnection(fullPhone);
    } catch (error) {
      const message = compactError(error);
      const failedStage = stageRef.current;
      connectionDiagnostic(failedStage === "completing" ? "CONNECTION_COMPLETE_FAILURE" : failedStage === "authorizing" ? "META_AUTH_FAILURE" : "CONNECTION_START_FAILURE", {
        businessId,
        message,
      });
      failConnection(message);
    }
  }, [beginStage, businessId, failConnection, finishMetaConnection, fullPhone, hasPendingConnection, localPhone, onRefresh, start, status.displayPhoneNumber]);

  const changeNumber = async () => {
    setErrorMessage(null);
    try {
      await change.mutateAsync(undefined);
      setShowForm(true);
      setPhone("");
      await onRefresh();
    } catch (error) {
      setErrorMessage(compactError(error));
      setRefreshCountdown(4);
    }
  };

  const disconnectNumber = () => {
    setErrorMessage(null);
    deactivate.mutate("Disconnected from settings.", {
      onSuccess: () => void onRefresh(),
      onError: (error) => {
        setErrorMessage(compactError(error));
        setRefreshCountdown(4);
      },
    });
  };

  if (disconnecting) {
    return <ConnectionLoadingState active={disconnecting} mode="disconnecting" stage="disconnecting" />;
  }

  if (connected) {
    return <ConnectedState status={status} canManage={canManage} onChangeNumber={changeNumber} onDisconnect={disconnectNumber} changing={change.isPending} disconnecting={disconnecting} />;
  }

  if (stage) {
    return <ConnectionLoadingState active stage={stage} />;
  }

  return (
    <div className="mx-auto max-w-xl text-center">
      <WhatsAppMark busy={connecting || status.status === "CONNECTING"} />
      <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary">WhatsApp connection</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Connect your account</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Connect the WhatsApp number customers already use to reach {businessName}. We will keep this simple.</p>

      {!canManage ? (
        <div className="mt-8 rounded-2xl border bg-card p-5 text-sm leading-6 text-muted-foreground">Only the business owner can connect or change the WhatsApp number.</div>
      ) : (
        <>
          {!showForm && (
            <div className="mt-8">
              <AppButton size="lg" className="rounded-full px-7" onClick={() => setShowForm(true)}><Smartphone className="size-4" />Connect your account</AppButton>
            </div>
          )}

          <div className={cn("grid overflow-hidden transition-all duration-300 ease-out", showForm ? "mt-8 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
            <div className="min-h-0">
              <div className="rounded-3xl border bg-card p-4 text-left shadow-[0_18px_70px_rgba(20,35,27,0.08)] sm:p-5">
                {status.status === "CONNECTING" && (
                  <div className="mb-4 rounded-2xl border border-warning/20 bg-warning/5 p-3 text-sm leading-6 text-muted-foreground">
                    <p className="font-bold text-foreground">Connection pending</p>
                    <p className="mt-1">The backend has started the connection, but Meta authorization still needs to finish. Continue below or try again.</p>
                  </div>
                )}
                <label htmlFor="whatsapp-local-number" className="text-sm font-bold">WhatsApp number</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-[170px_1fr]">
                  <AppSelect value={countryCode} onValueChange={setCountryCode} options={COUNTRY_CODES} aria-label="Country code" className="rounded-2xl" />
                  <AppInput id="whatsapp-local-number" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="24 123 4567" className="h-11 rounded-2xl" autoComplete="tel-national" />
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Select your country code, then enter the local number without the country code.</p>
                <AppButton className="mt-5 w-full rounded-2xl" loading={connecting} loadingText="Connecting your number" disabled={!canSubmitConnection || connecting} onClick={connect}>{hasPendingConnection ? "Continue connection" : "Connect account"}</AppButton>
              </div>
            </div>
          </div>
        </>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-left text-sm">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-bold">Something went wrong</p>
              <p className="mt-1 leading-6 text-muted-foreground">{errorMessage}</p>
              {refreshCountdown !== null && <p className="mt-2 text-xs font-semibold text-muted-foreground">Refreshing connection status in {refreshCountdown}s...</p>}
            </div>
          </div>
        </div>
      )}

      {canManage && status.status === "CONNECTED" && showForm && (
        <div className="mt-6 flex justify-center gap-2">
          <AppButton variant="ghost" onClick={() => setShowForm(false)}>Cancel</AppButton>
        </div>
      )}

      {canManage && ["DEACTIVATED", "ERROR"].includes(status.status) && (
        <p className="mt-6 text-xs text-muted-foreground">Current status: {STATUS_LABELS[status.status]}</p>
      )}
    </div>
  );
}

export function SettingsWhatsAppPage() {
  const profile = useCurrentUser();
  const businessId = profile.data?.activeBusiness?.id;
  const status = useWhatsAppStatus(businessId);
  const businessName = profile.data?.activeBusiness?.name ?? "this business";

  const refreshStatus = useMemo(() => async () => status.refetch(), [status]);

  useEffect(() => {
    if (!status.data || !businessId) return;
    connectionDiagnostic("STATUS_REFETCH", { businessId, reason: "page-load", status: status.data.status, provider: status.data.provider });
  }, [businessId, status.data]);

  if (profile.isPending) return <LoadingPage />;
  if (profile.isError || !businessId) return <AppErrorState title="No active business" description="Select a business before managing WhatsApp." />;
  if (status.isPending) return <LoadingPage />;
  if (status.isError) return <main className="mx-auto max-w-3xl p-5 sm:p-8"><AppErrorState title="Could not load WhatsApp connection" description={getApiErrorMessage(status.error)} onRetry={() => status.refetch()} /></main>;

  const canManage = profile.data.membership?.role === "BUSINESS_OWNER";

  return (
    <main className="grid min-h-[calc(100dvh-8rem)] place-items-center px-4 py-10 sm:px-6">
      <ConnectAccountFlow businessName={businessName} status={status.data} businessId={businessId} canManage={canManage} onRefresh={refreshStatus} />
    </main>
  );
}
