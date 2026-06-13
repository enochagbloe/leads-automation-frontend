"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  CircleOff,
  Clock3,
  HeartPulse,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Unplug,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { AppErrorState } from "@/components/app-error-state";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { LoadingPage } from "@/components/states/loading-states";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useCompleteWhatsAppConnection,
  useDeactivateWhatsAppConnection,
  useStartWhatsAppConnection,
  useStartWhatsAppNumberChange,
  useWhatsAppHealth,
  useWhatsAppStatus,
} from "@/hooks/use-whatsapp";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { CompleteWhatsAppConnectionInput, WhatsAppConnectionStatus, WhatsAppProvider, WhatsAppStatus } from "@/types/whatsapp";

const STATUS_COPY: Record<WhatsAppConnectionStatus, { title: string; description: string; icon: typeof MessageCircle; tone: string }> = {
  NOT_CONNECTED: { title: "WhatsApp is not connected", description: "Connect your WhatsApp number to start receiving and replying to customer messages from BizReply.", icon: Unplug, tone: "bg-muted text-muted-foreground" },
  CONNECTING: { title: "WhatsApp connection in progress", description: "Complete the provider connection to activate WhatsApp messaging.", icon: Clock3, tone: "bg-warning/10 text-warning" },
  CONNECTED: { title: "WhatsApp connected", description: "This business can receive and reply to WhatsApp conversations.", icon: CheckCircle2, tone: "bg-success/10 text-success" },
  DEACTIVATED: { title: "WhatsApp is deactivated", description: "Previous conversations and leads are preserved, but replies and automation are disabled.", icon: CircleOff, tone: "bg-muted text-muted-foreground" },
  ERROR: { title: "WhatsApp connection has an issue", description: "Review the connection health and reconnect the number if needed.", icon: AlertTriangle, tone: "bg-destructive/10 text-destructive" },
};

function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available";
}

function whatsappError(error: unknown) {
  if (!(error instanceof ApiError)) return getApiErrorMessage(error);
  const messages: Record<string, string> = {
    WHATSAPP_ALREADY_CONNECTED: "This business already has an active WhatsApp number.",
    WHATSAPP_NUMBER_LIMIT_REACHED: "Your current plan allows one WhatsApp number per business.",
    WHATSAPP_PROVIDER_CONFIG_MISSING: "WhatsApp provider configuration is missing. Please contact support.",
    WHATSAPP_PROVIDER_OWNERSHIP_VERIFICATION_FAILED: "We could not verify ownership of this WhatsApp number. Check the Meta connection and try again.",
    WHATSAPP_PROVIDER_UNAVAILABLE: "WhatsApp provider is temporarily unavailable. Please try again later.",
    WHATSAPP_CONNECTION_NOT_STARTED: "Start the WhatsApp connection before completing it.",
    WHATSAPP_CONNECTION_NOT_FOUND: "No active WhatsApp connection was found.",
    FORBIDDEN: "You do not have permission to manage WhatsApp connection.",
    BUSINESS_ACCESS_DENIED: "You do not have access to this business.",
  };
  return messages[error.code] ?? error.message;
}

function ModalShell({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children: React.ReactNode }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogPortal><DialogOverlay /><DialogContent className="left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-[0_24px_80px_rgba(20,35,27,0.22)]"><div className="flex items-start justify-between gap-4"><div><DialogTitle className="text-lg font-bold">{title}</DialogTitle><DialogDescription className="mt-1 text-sm leading-6 text-muted-foreground">{description}</DialogDescription></div><DialogClose className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close dialog"><X className="size-4" /></DialogClose></div><div className="mt-6">{children}</div></DialogContent></DialogPortal></Dialog>;
}

export function ConnectWhatsAppDialog({ open, onOpenChange, businessId, connecting }: { open: boolean; onOpenChange: (open: boolean) => void; businessId: string; connecting?: boolean }) {
  const mockAvailable = process.env.NODE_ENV !== "production";
  const start = useStartWhatsAppConnection(businessId);
  const complete = useCompleteWhatsAppConnection(businessId);
  const [provider, setProvider] = useState<WhatsAppProvider>(connecting || !mockAvailable ? "META_WHATSAPP" : "MOCK_WHATSAPP");
  const [phone, setPhone] = useState("");
  const [meta, setMeta] = useState<CompleteWhatsAppConnectionInput>({ provider: "META_WHATSAPP", phoneNumberId: "", wabaId: "", businessAccountId: "", authorizationCode: "" });
  const fail = (error: unknown) => toast.error("WhatsApp connection failed", { description: whatsappError(error) });

  const startConnection = () => start.mutate({ provider, displayPhoneNumber: phone.trim() || undefined }, {
    onSuccess: () => { toast.success(provider === "MOCK_WHATSAPP" ? "Mock WhatsApp connected" : "Meta connection started"); onOpenChange(false); },
    onError: fail,
  });
  const completeConnection = () => complete.mutate({ ...meta, businessAccountId: meta.businessAccountId || undefined }, {
    onSuccess: () => { toast.success("WhatsApp connected"); onOpenChange(false); },
    onError: fail,
  });

  return <ModalShell open={open} onOpenChange={onOpenChange} title={connecting ? "Continue WhatsApp setup" : "Connect WhatsApp"} description="One active WhatsApp number can be connected to this business. Provider credentials are exchanged securely by the backend.">
    {!connecting && <div><label className="mb-1.5 block text-sm font-semibold">Connection method</label><AppSelect value={provider} onValueChange={(value) => setProvider(value as WhatsAppProvider)} options={[...(mockAvailable ? [{ value: "MOCK_WHATSAPP", label: "Mock WhatsApp", description: "Local development and testing only" }] : []), { value: "META_WHATSAPP", label: "Meta WhatsApp", description: "Starts the live provider connection flow" }]} /></div>}
    {!connecting && <div className="mt-4"><label htmlFor="whatsapp-phone" className="mb-1.5 block text-sm font-semibold">WhatsApp phone number</label><AppInput id="whatsapp-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+233 24 123 4567" /><p className="mt-1.5 text-xs text-muted-foreground">Use the international format including country code.</p></div>}
    {connecting && <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="phone-number-id" className="mb-1.5 block text-sm font-semibold">Phone number ID</label><AppInput id="phone-number-id" value={meta.phoneNumberId} onChange={(event) => setMeta({ ...meta, phoneNumberId: event.target.value })} /></div><div><label htmlFor="waba-id" className="mb-1.5 block text-sm font-semibold">WABA ID</label><AppInput id="waba-id" value={meta.wabaId} onChange={(event) => setMeta({ ...meta, wabaId: event.target.value })} /></div><div className="sm:col-span-2"><label htmlFor="business-account-id" className="mb-1.5 block text-sm font-semibold">Meta business account ID <span className="font-normal text-muted-foreground">(optional)</span></label><AppInput id="business-account-id" value={meta.businessAccountId} onChange={(event) => setMeta({ ...meta, businessAccountId: event.target.value })} /></div><div className="sm:col-span-2"><label htmlFor="authorization-code" className="mb-1.5 block text-sm font-semibold">Short-lived authorization code</label><AppInput id="authorization-code" value={meta.authorizationCode} onChange={(event) => setMeta({ ...meta, authorizationCode: event.target.value })} /><p className="mt-1.5 text-xs text-muted-foreground">Never enter or store a raw Meta access token here.</p></div></div>}
    <div className="mt-6 flex justify-end gap-2"><DialogClose asChild><AppButton variant="outline">Cancel</AppButton></DialogClose><AppButton loading={start.isPending || complete.isPending} loadingText="Connecting" disabled={connecting ? !meta.phoneNumberId.trim() || !meta.wabaId.trim() || !meta.authorizationCode.trim() : provider === "MOCK_WHATSAPP" && !phone.trim()} onClick={connecting ? completeConnection : startConnection}>{connecting ? "Complete connection" : "Start connection"}</AppButton></div>
  </ModalShell>;
}

export function DeactivateWhatsAppDialog({ open, onOpenChange, businessId }: { open: boolean; onOpenChange: (open: boolean) => void; businessId: string }) {
  const mutation = useDeactivateWhatsAppConnection(businessId);
  const [reason, setReason] = useState("Disconnected from settings.");
  return <ModalShell open={open} onOpenChange={onOpenChange} title="Deactivate WhatsApp?" description="Outbound replies and automation will stop. Existing leads, conversations, and messages will remain available."><label htmlFor="deactivate-reason" className="mb-1.5 block text-sm font-semibold">Reason</label><AppInput id="deactivate-reason" value={reason} onChange={(event) => setReason(event.target.value)} /><div className="mt-6 flex justify-end gap-2"><DialogClose asChild><AppButton variant="outline">Cancel</AppButton></DialogClose><AppButton variant="destructive" loading={mutation.isPending} loadingText="Deactivating" onClick={() => mutation.mutate(reason, { onSuccess: () => { toast.success("WhatsApp deactivated"); onOpenChange(false); }, onError: (error) => toast.error("Could not deactivate WhatsApp", { description: whatsappError(error) }) })}>Deactivate</AppButton></div></ModalShell>;
}

export function ChangeWhatsAppNumberDialog({ open, onOpenChange, businessId, onStarted }: { open: boolean; onOpenChange: (open: boolean) => void; businessId: string; onStarted: () => void }) {
  const mutation = useStartWhatsAppNumberChange(businessId);
  return <ModalShell open={open} onOpenChange={onOpenChange} title="Change WhatsApp number?" description="The current number will be deactivated first. Its conversation history remains available while you connect a new number."><div className="rounded-xl border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">There may be a short period where WhatsApp replies are unavailable until the new connection is complete.</div><div className="mt-6 flex justify-end gap-2"><DialogClose asChild><AppButton variant="outline">Cancel</AppButton></DialogClose><AppButton loading={mutation.isPending} loadingText="Starting change" onClick={() => mutation.mutate(undefined, { onSuccess: () => { toast.success("Previous number deactivated"); onOpenChange(false); onStarted(); }, onError: (error) => toast.error("Could not change WhatsApp number", { description: whatsappError(error) }) })}>Continue</AppButton></div></ModalShell>;
}

export function WhatsAppConnectionErrorAlert({ status }: { status: WhatsAppStatus }) {
  if (!status.lastErrorMessage && status.status !== "ERROR") return null;
  return <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" /><div><p className="font-semibold text-foreground">Connection issue{status.lastErrorCode ? ` · ${status.lastErrorCode}` : ""}</p><p className="mt-1 leading-6 text-muted-foreground">{status.lastErrorMessage ?? "The WhatsApp connection needs attention."}</p></div></div>;
}

export function WhatsAppConnectionStatusCard({ status, canManage, onConnect, onContinue, onDeactivate, onChange }: { status: WhatsAppStatus; canManage: boolean; onConnect: () => void; onContinue: () => void; onDeactivate: () => void; onChange: () => void }) {
  const copy = STATUS_COPY[status.status];
  const Icon = copy.icon;
  return <AppCard className="overflow-hidden p-0"><div className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", copy.tone)}><Icon className="size-5" /></span><div><h2 className="text-lg font-bold">{copy.title}</h2><p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{copy.description}</p></div></div><span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", copy.tone)}>{status.status.replaceAll("_", " ")}</span></div><WhatsAppConnectionErrorAlert status={status} /><dl className="mt-6 grid gap-4 border-t pt-5 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-muted-foreground">Connected number</dt><dd className="mt-1 font-semibold">{status.displayPhoneNumber ?? "Not connected"}</dd></div><div><dt className="text-muted-foreground">Provider</dt><dd className="mt-1 font-semibold">{status.provider?.replaceAll("_", " ") ?? "Not selected"}</dd></div><div><dt className="text-muted-foreground">Connected</dt><dd className="mt-1 font-semibold">{formatDate(status.connectedAt)}</dd></div><div><dt className="text-muted-foreground">Automation</dt><dd className="mt-1 font-semibold">{status.automationEnabled ? "Enabled" : "Disabled"}</dd></div><div><dt className="text-muted-foreground">Outbound replies</dt><dd className="mt-1 font-semibold">{status.canSendMessages ? "Available" : "Blocked"}</dd></div><div><dt className="text-muted-foreground">Last health check</dt><dd className="mt-1 font-semibold">{formatDate(status.lastHealthCheckAt)}</dd></div></dl></div><div className="flex flex-wrap gap-2 border-t bg-muted/25 px-5 py-4 sm:px-6">{canManage && ["NOT_CONNECTED", "DEACTIVATED", "ERROR"].includes(status.status) && <AppButton onClick={onConnect}><Smartphone className="size-4" />Connect WhatsApp</AppButton>}{canManage && status.status === "CONNECTING" && <AppButton onClick={onContinue}>Continue setup</AppButton>}{canManage && status.status === "CONNECTED" && <><AppButton variant="outline" onClick={onChange}><ArrowRightLeft className="size-4" />Change number</AppButton><AppButton variant="outline" onClick={onDeactivate}><Unplug className="size-4" />Deactivate</AppButton></>}{!canManage && <p className="text-sm text-muted-foreground">Only the business owner can manage the WhatsApp connection.</p>}</div></AppCard>;
}

export function WhatsAppConnectionHealthCard({ businessId }: { businessId: string }) {
  const health = useWhatsAppHealth(businessId);
  if (health.isPending) return <AppCard className="min-h-72 animate-pulse bg-muted/30" />;
  if (health.isError) return <AppErrorState title="Could not load WhatsApp health" description={getApiErrorMessage(health.error)} onRetry={() => health.refetch()} />;
  const rows = [{ label: "Receiving messages", value: health.data.canReceiveMessages, icon: MessageCircle }, { label: "Sending replies", value: health.data.canSendMessages, icon: Phone }, { label: "Automation", value: health.data.automationEnabled, icon: Activity }];
  return <AppCard><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><HeartPulse className="size-4 text-primary" /><h2 className="font-bold">Connection health</h2></div><p className="mt-1 text-sm text-muted-foreground">Current messaging availability for this business.</p></div><AppButton size="icon" variant="outline" aria-label="Refresh WhatsApp health" onClick={() => health.refetch()}><RefreshCw className="size-4" /></AppButton></div><ul className="mt-6 space-y-3">{rows.map(({ label, value, icon: Icon }) => <li key={label} className="flex items-center justify-between rounded-xl border bg-muted/20 p-3 text-sm"><span className="flex items-center gap-2 font-medium"><Icon className="size-4 text-muted-foreground" />{label}</span><span className={value ? "font-semibold text-success" : "font-semibold text-muted-foreground"}>{value ? "Available" : "Unavailable"}</span></li>)}</ul><dl className="mt-6 space-y-3 border-t pt-5 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Last inbound message</dt><dd className="text-right font-medium">{formatDate(health.data.lastInboundMessageAt)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Last outbound message</dt><dd className="text-right font-medium">{formatDate(health.data.lastOutboundMessageAt)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Last checked</dt><dd className="text-right font-medium">{formatDate(health.data.lastHealthCheckAt)}</dd></div></dl></AppCard>;
}

export function SettingsWhatsAppPage() {
  const profile = useCurrentUser();
  const businessId = profile.data?.activeBusiness?.id;
  const status = useWhatsAppStatus(businessId);
  const [connectOpen, setConnectOpen] = useState(false);
  const [continueOpen, setContinueOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  if (profile.isPending || status.isPending) return <LoadingPage />;
  if (profile.isError || !businessId) return <AppErrorState title="No active business" description="Select a business before managing WhatsApp." />;
  if (status.isError) return <main className="mx-auto max-w-6xl p-5 sm:p-8"><AppErrorState title="Could not load WhatsApp connection" description={getApiErrorMessage(status.error)} onRetry={() => status.refetch()} /></main>;
  const canManage = profile.data.membership?.role === "BUSINESS_OWNER";
  return <main className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8"><header><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Business settings</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">WhatsApp connection</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Manage the single WhatsApp number connected to {profile.data.activeBusiness?.name}. Connection history and existing conversations remain preserved.</p></header><WhatsAppConnectionStatusCard status={status.data} canManage={canManage} onConnect={() => setConnectOpen(true)} onContinue={() => setContinueOpen(true)} onDeactivate={() => setDeactivateOpen(true)} onChange={() => setChangeOpen(true)} /><div className="grid gap-5 lg:grid-cols-[1fr_.65fr]"><WhatsAppConnectionHealthCard businessId={businessId} /><AppCard><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h2 className="font-bold">Security and limits</h2></div><ul className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground"><li>One active WhatsApp number per business in V1.</li><li>Provider credentials are encrypted and never returned to this page.</li><li>Only the business owner can connect, deactivate, or change the number.</li><li>Deactivation preserves all existing leads, conversations, and messages.</li></ul></AppCard></div><ConnectWhatsAppDialog open={connectOpen} onOpenChange={setConnectOpen} businessId={businessId} /><ConnectWhatsAppDialog open={continueOpen} onOpenChange={setContinueOpen} businessId={businessId} connecting /><DeactivateWhatsAppDialog open={deactivateOpen} onOpenChange={setDeactivateOpen} businessId={businessId} /><ChangeWhatsAppNumberDialog open={changeOpen} onOpenChange={setChangeOpen} businessId={businessId} onStarted={() => setConnectOpen(true)} /></main>;
}
