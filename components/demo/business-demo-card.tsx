"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AppButton } from "@/components/app-button";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";

export function BusinessDemoCard() {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true); setError("");
    try {
      const result = await apiRequest<{ invite: string }>("/demo/business/invite", { method: "POST" });
      setLink(`${window.location.origin}/demo#invite=${encodeURIComponent(result.invite)}`);
    } catch (e) { setError(getApiErrorMessage(e)); } finally { setBusy(false); }
  }
  return <section className="mb-6 w-full max-w-3xl rounded-2xl border bg-card p-6">
    <h2 className="text-lg font-bold">Try your business demo</h2>
    <p className="my-3 text-sm text-muted-foreground">Scan to chat as a customer. Up to five active sessions appear live in your Conversations inbox. Demo chats cannot create real bookings or send WhatsApp messages.</p>
    <AppButton onClick={generate} disabled={busy}>{busy ? "Creating link…" : link ? "Refresh demo link" : "Create demo QR code"}</AppButton>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    {link && <div className="mt-5 flex flex-wrap items-center gap-6"><QRCodeSVG value={link} size={200} marginSize={4} title="Open customer demo" /><div className="space-y-3"><a className="block underline" href={link} target="_blank" rel="noreferrer">Open customer chat</a><a className="block underline" href="/conversations">Watch in Conversations</a><p className="text-xs text-muted-foreground">Link valid for 24 hours. Each chat expires automatically.</p></div></div>}
  </section>;
}
