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
  if (process.env.NODE_ENV === "production") return;
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) window.clearTimeout(timeoutId);
  });
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

function parseMetaMessage(data: unknown): Record<string, unknown> | null {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return null;
}

async function runMetaAuthorization(): Promise<MetaAuthorizationResult> {
  await loadMetaSdk();
  const facebook = window.FB;
  if (!facebook || !env.metaWhatsAppConfigId) throw new Error("Meta authorization is not available.");

  return withTimeout(new Promise<MetaAuthorizationResult>((resolve, reject) => {
    let authorizationCode = "";
    let phoneNumberId = "";
    let wabaId = "";
    let displayPhoneNumber: string | undefined;
    let businessAccountId: string | undefined;
    let metadata: Record<string, unknown> = {};
    let settled = false;

    const cleanup = () => window.removeEventListener("message", handleMessage);
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };
    const finishIfReady = () => {
      if (settled || !authorizationCode) return;
      if (!phoneNumberId || !wabaId) return;
      settled = true;
      cleanup();
      resolve({ authorizationCode, phoneNumberId, wabaId, displayPhoneNumber, businessAccountId, metadata });
    };

    function handleMessage(event: MessageEvent) {
      if (!event.origin.includes("facebook.com")) return;
      const payload = parseMetaMessage(event.data);
      if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;

      metadata = { ...metadata, embeddedSignupEvent: payload.event, embeddedSignupVersion: payload.version };
      if (payload.event === "FINISH") {
        const data = (payload.data && typeof payload.data === "object" ? payload.data : {}) as Record<string, unknown>;
        phoneNumberId = String(data.phone_number_id ?? data.phoneNumberId ?? "");
        wabaId = String(data.waba_id ?? data.wabaId ?? "");
        const rawDisplayPhoneNumber = data.display_phone_number ?? data.displayPhoneNumber ?? data.phone_number ?? data.phoneNumber;
        displayPhoneNumber = rawDisplayPhoneNumber ? String(rawDisplayPhoneNumber) : undefined;
        const businessId = data.business_id ?? data.businessAccountId;
        businessAccountId = businessId ? String(businessId) : undefined;
        metadata = {
          ...metadata,
          displayPhoneNumber,
          hasPhoneNumberId: Boolean(phoneNumberId),
          hasWabaId: Boolean(wabaId),
          hasBusinessAccountId: Boolean(businessAccountId),
        };
        finishIfReady();
      }
      if (payload.event === "CANCEL") fail("Meta authorization was cancelled before the number was connected.");
      if (payload.event === "ERROR") fail("Meta authorization failed. Please try again.");
    }

    window.addEventListener("message", handleMessage);
    facebook.login((response) => {
      authorizationCode = response.authResponse?.code ?? "";
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
  }), 90000, "Meta authorization timed out. Please try again.");
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
        await finishMetaConnection(status.displayPhoneNumber ?? undefined);
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
  }, [beginStage, businessId, failConnection, finishMetaConnection, fullPhone, hasPendingConnection, onRefresh, start, status.displayPhoneNumber]);

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
