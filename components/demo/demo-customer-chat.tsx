"use client";
import { useEffect, useRef, useState } from "react";
import { env } from "@/lib/env";
import { AppButton } from "@/components/app-button";
import { MessageBubble } from "@/components/conversations/conversation-workspace";
import { ConversationComposer } from "@/components/conversations/composer/conversation-composer";
import type { ConversationMessage } from "@/types/conversation";

type Session = { token: string; demo: { expiresAt: string; business: { name: string }; conversation: { id: string } } };
type DemoMessage = Pick<ConversationMessage, "id" | "senderType" | "direction" | "messageType" | "createdAt"> & { text: string };
async function request<T>(path: string, token?: string, body?: unknown, method = body ? "POST" : "GET", key?: string): Promise<T> {
  // Deliberately independent of the owner's JWT, business header and token refresh flow.
  const response = await fetch(`${env.apiUrl}/demo${path}`, { method, cache: "no-store", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key ? { "Idempotency-Key": key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error?.message ?? data.message ?? "Demo unavailable. Please try again."), { status: response.status });
  return data;
}
export function DemoCustomerChat() {
  const [invite, setInvite] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [expired, setExpired] = useState(false);
  const pending = useRef<{ text: string; clientMessageId: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const restore = window.setTimeout(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("invite") ?? "";
    setInvite(value);
    try { const saved = sessionStorage.getItem(`demo:${value}`); if (saved) setSession(JSON.parse(saved)); } catch { setError("Could not restore this demo session."); }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController(); let stopped = false; let loading = false;
    const refresh = async () => {
      if (loading || stopped) return;
      if (Date.parse(session.demo.expiresAt) <= Date.now()) { setExpired(true); controller.abort(); return; }
      loading = true;
      try { const data = await request<{ messages: DemoMessage[] }>("/session/messages", session.token); if (!stopped) setMessages(data.messages); }
      catch (e) { if (!stopped) { setError((e as Error).message); if ([401,403].includes((e as {status?:number}).status ?? 0)) { setExpired(true); controller.abort(); } } }
      finally { loading = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    // Same authenticated SSE transport as the existing inbox; polling recovers missed events.
    void (async () => {
      while (!stopped && !controller.signal.aborted) {
        try {
          const response = await fetch(`${env.apiUrl}/demo/session/events`, { headers: { Authorization: `Bearer ${session.token}` }, signal: controller.signal, cache: "no-store" });
          if (!response.ok || !response.body) break;
          const reader = response.body.getReader();
          try { while (!stopped) { const chunk = await reader.read(); if (chunk.done) break; void refresh(); } } finally { await reader.cancel().catch(() => {}); }
        } catch { if (stopped) break; }
        if (!stopped) await new Promise(resolve => setTimeout(resolve, 3000));
      }
    })();
    return () => { stopped = true; controller.abort(); clearInterval(timer); };
  }, [session]);
  async function join() {
    setBusy(true); setError("");
    try {
      const storageKey = `demo-join:${invite}`;
      const key = sessionStorage.getItem(storageKey) ?? crypto.randomUUID(); sessionStorage.setItem(storageKey,key);
      const joined = await request<Session>("/join", undefined, { invite }, "POST", key);
      sessionStorage.setItem(`demo:${invite}`, JSON.stringify(joined)); setSession(joined); setExpired(false);
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function send(text: string) {
    if (!session || busy || expired) return;
    if (text.length > 2000) { setError("Please keep messages under 2,000 characters."); return; }
    setBusy(true); setError("");
    if (pending.current?.text !== text) pending.current = { text, clientMessageId: crypto.randomUUID() };
    try {
      await request("/session/messages", session.token, pending.current);
      pending.current = null; setDraft("");
      const data = await request<{ messages: DemoMessage[] }>("/session/messages", session.token); setMessages(data.messages);
    } catch(e) { setError(`${(e as Error).message} Your message may already be saved; retrying this text will not duplicate it.`); } finally { setBusy(false); }
  }
  async function end() {
    if (!session) return;
    setBusy(true);
    try { if (!expired) await request("/session", session.token, undefined, "DELETE"); sessionStorage.removeItem(`demo:${invite}`); sessionStorage.removeItem(`demo-join:${invite}`); setSession(null); setExpired(false); setError(""); setMessages([]); setDraft(""); pending.current = null; }
    catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-dvh max-w-3xl flex-col p-4">
    <header className="border-b py-4"><h1 className="text-xl font-bold">{session?.demo.business.name ?? "BizReply customer demo"}</h1><p className="mt-2 text-sm text-muted-foreground">Demo only. Your messages are visible to this business owner. No real bookings or external messages are created.</p>{session && <p className="mt-2 text-xs">Expires {new Date(session.demo.expiresAt).toLocaleTimeString()}</p>}</header>
    {error && <p role="alert" className="my-3 text-sm text-destructive">{error}</p>}
    {!session ? <AppButton className="my-6" disabled={!invite || busy} onClick={join}>{busy ? "Starting…" : "Start demo chat"}</AppButton> : <>
      <section aria-label="Demo messages" aria-live="polite" className="flex-1 py-6">{messages.map(m => <MessageBubble key={m.id} channel="DEMO" retrying={false} onRetry={() => {}} message={{ ...m, content: m.text, businessId: "", leadId: "", conversationId: session.demo.conversation.id, senderUserId: null, senderUser: null, deliveryStatus: "SENT", metadata: null, readAt: null, updatedAt: m.createdAt, deletedAt: null }} />)}<div ref={bottom} /></section>
      {expired ? <p role="status">This demo has expired. Scan a current QR code to start again.</p> : <ConversationComposer channels={[{id:"demo",name:"Demo"}]} activeChannelId="demo" senderAccounts={[{id:"customer",name:"You"}]} activeSenderAccountId="customer" message={draft} onMessageChange={setDraft} onSendMessage={({message}) => send(message)} disabled={busy} isSending={busy} attachmentDisabled emojiDisabled voiceNoteDisabled endChatDisabled />}
      <AppButton className="my-3" variant="ghost" disabled={busy} onClick={end}>{expired ? "Start a new demo" : "End demo and release session"}</AppButton>
    </>}
  </main>;
}
