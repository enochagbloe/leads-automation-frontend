"use client";

import {
  AlertTriangle,
  ArrowRightLeft,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppButton } from "@/components/app-button";
import { AppErrorState } from "@/components/app-error-state";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { LoadingPage } from "@/components/states/loading-states";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useDeactivateWhatsAppConnection,
  useStartWhatsAppConnection,
  useStartWhatsAppNumberChange,
  useWhatsAppStatus,
} from "@/hooks/use-whatsapp";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { WhatsAppConnectionStatus, WhatsAppProvider, WhatsAppStatus } from "@/types/whatsapp";

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

const STATUS_LABELS: Record<WhatsAppConnectionStatus, string> = {
  NOT_CONNECTED: "Not connected",
  CONNECTING: "Connection pending",
  CONNECTED: "Connected",
  DEACTIVATED: "Deactivated",
  ERROR: "Needs attention",
};

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
  return process.env.NODE_ENV === "production" ? "META_WHATSAPP" : "MOCK_WHATSAPP";
}

function WhatsAppMark({ connected, busy }: { connected?: boolean; busy?: boolean }) {
  return (
    <div className="relative mx-auto grid size-24 place-items-center rounded-[2rem] bg-secondary text-primary shadow-[0_18px_60px_rgba(7,94,69,0.16)]">
      <MessageCircle className="size-11" strokeWidth={1.8} />
      <span className={cn("absolute right-4 top-4 size-3 rounded-full ring-4 ring-card", connected ? "bg-success" : busy ? "animate-pulse bg-warning" : "bg-muted-foreground")} />
    </div>
  );
}

function ConnectionLoadingState({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => {
      setStep((value) => Math.min(value + 1, CONNECTING_STEPS.length - 1));
    }, 1200);
    return () => window.clearInterval(interval);
  }, [active]);

  return (
    <div className="mx-auto grid min-h-[420px] max-w-md place-items-center text-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Connecting</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{CONNECTING_STEPS[active ? step : 0]}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Please keep this page open. We are preparing your WhatsApp workspace.</p>
        <div className="mx-auto mt-7 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

function ConnectedState({ status, canManage, onChangeNumber, changing }: { status: WhatsAppStatus; canManage: boolean; onChangeNumber: () => void; changing: boolean }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <WhatsAppMark connected />
      <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-success">We are set</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">WhatsApp is connected</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Customer messages can now land inside BizReply for this business.</p>
      <p className="mt-7 text-sm text-muted-foreground">Connected number: <span className="font-bold text-foreground">{status.displayPhoneNumber ?? "Number connected"}</span></p>
      {canManage && (
        <div className="mt-6 flex justify-center">
          <AppButton variant="outline" loading={changing} loadingText="Preparing" onClick={onChangeNumber}><ArrowRightLeft className="size-4" />Change number</AppButton>
        </div>
      )}
    </div>
  );
}

function ConnectAccountFlow({ businessName, status, businessId, canManage, onRefresh }: { businessName: string; status: WhatsAppStatus; businessId: string; canManage: boolean; onRefresh: () => Promise<unknown> }) {
  const start = useStartWhatsAppConnection(businessId);
  const change = useStartWhatsAppNumberChange(businessId);
  const deactivate = useDeactivateWhatsAppConnection(businessId);
  const [showForm, setShowForm] = useState(status.status === "CONNECTING" || status.status === "ERROR");
  const [countryCode, setCountryCode] = useState("+233");
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);
  const localPhone = normalizeLocalPhone(phone);
  const fullPhone = `${countryCode}${localPhone}`;
  const connecting = start.isPending || change.isPending;
  const connected = status.status === "CONNECTED";
  const showLoadingState = connecting || status.status === "CONNECTING";

  useEffect(() => {
    if (refreshCountdown === null) return;
    if (refreshCountdown <= 0) {
      void onRefresh().finally(() => {
        setRefreshCountdown(null);
        setErrorMessage(null);
      });
      return;
    }
    const timeout = window.setTimeout(() => setRefreshCountdown((value) => (value ?? 1) - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [onRefresh, refreshCountdown]);

  const connect = async () => {
    setErrorMessage(null);
    try {
      await start.mutateAsync({ provider: providerForEnvironment(), displayPhoneNumber: fullPhone });
      await onRefresh();
    } catch (error) {
      setErrorMessage(compactError(error));
      setRefreshCountdown(4);
    }
  };

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

  if (connected) {
    return <ConnectedState status={status} canManage={canManage} onChangeNumber={changeNumber} changing={change.isPending} />;
  }

  if (showLoadingState) {
    return <ConnectionLoadingState active={showLoadingState} />;
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
                <label htmlFor="whatsapp-local-number" className="text-sm font-bold">WhatsApp number</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-[170px_1fr]">
                  <AppSelect value={countryCode} onValueChange={setCountryCode} options={COUNTRY_CODES} aria-label="Country code" className="rounded-2xl" />
                  <AppInput id="whatsapp-local-number" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="24 123 4567" className="h-11 rounded-2xl" autoComplete="tel-national" />
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Select your country code, then enter the local number without the country code.</p>
                <AppButton className="mt-5 w-full rounded-2xl" loading={connecting} loadingText="Connecting your number" disabled={!localPhone || connecting} onClick={connect}>Connect account</AppButton>
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
      {canManage && status.status === "CONNECTED" && (
        <button type="button" className="mt-6 text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground" disabled={deactivate.isPending} onClick={() => deactivate.mutate("Disconnected from settings.", { onSuccess: () => void onRefresh() })}>Disconnect number</button>
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

  if (profile.isPending || status.isPending) return <LoadingPage />;
  if (profile.isError || !businessId) return <AppErrorState title="No active business" description="Select a business before managing WhatsApp." />;
  if (status.isError) return <main className="mx-auto max-w-3xl p-5 sm:p-8"><AppErrorState title="Could not load WhatsApp connection" description={getApiErrorMessage(status.error)} onRetry={() => status.refetch()} /></main>;

  const canManage = profile.data.membership?.role === "BUSINESS_OWNER";

  return (
    <main className="grid min-h-[calc(100dvh-8rem)] place-items-center px-4 py-10 sm:px-6">
      <ConnectAccountFlow businessName={businessName} status={status.data} businessId={businessId} canManage={canManage} onRefresh={refreshStatus} />
    </main>
  );
}
