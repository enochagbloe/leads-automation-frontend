"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, ExternalLink, FileText, Filter, Plus, Search, Send, TriangleAlert } from "lucide-react";
import { systemNotify } from "@/lib/system-notifications";
import { AppButton } from "@/components/app-button";
import { AppEmptyState } from "@/components/app-empty-state";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-auth";
import { useKnowledgeSearch, useSendKnowledgeAsset } from "@/hooks/use-knowledge";
import { getApiErrorMessage } from "@/lib/api-client";
import type { KnowledgeAssetType, KnowledgeSearchResult } from "@/types/knowledge";

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fileSize(value?: number | null) {
  if (!value) return "File size unknown";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function assetTypeLabel(asset: KnowledgeSearchResult) {
  if (asset.assetType === "ARTICLE") return "Article";
  if (asset.mimeType === "application/pdf" || asset.fileName?.toLowerCase().endsWith(".pdf")) return "PDF";
  return "Document";
}

function disabledReason(asset: KnowledgeSearchResult) {
  if (asset.canSendToClient) return null;
  if (asset.assetType === "ARTICLE" && asset.status !== "PUBLISHED") return "Draft article cannot be sent";
  if (asset.assetType === "DOCUMENT" && asset.status === "ARCHIVED") return "Archived document cannot be sent";
  if (asset.visibility === "INTERNAL_ONLY") return "Internal-only asset cannot be sent";
  return "This asset is not sendable yet";
}

function defaultMessage(asset: KnowledgeSearchResult) {
  const title = asset.title.toLowerCase();
  if (asset.assetType === "DOCUMENT") return "Here is the document for your review.";
  if (title.includes("payment") || title.includes("deposit")) return "I’ve attached our payment and deposit policy for you.";
  if (title.includes("profile")) return "Here is our company profile for your review.";
  if (title.includes("package")) return "Here is our full package guide with the details included.";
  return "Here is our full guide for your review.";
}

function sendError(reason?: string) {
  const reasons: Record<string, string> = {
    ARTICLE_NOT_PUBLISHED: "This article is not published yet, so it cannot be sent.",
    ARTICLE_NOT_SENDABLE: "This article cannot be sent to customers yet.",
    DOCUMENT_NOT_SENDABLE: "This document cannot be sent to customers yet.",
    DOCUMENT_ARCHIVED: "This document is archived and cannot be sent.",
    WHATSAPP_DOCUMENT_SEND_NOT_CONFIGURED: "WhatsApp document sending is not configured yet.",
    PDF_GENERATION_FAILED: "BizReply could not prepare the PDF. Please try again.",
  };
  return reason ? reasons[reason] ?? titleCase(reason) : "The asset could not be sent. Please try again.";
}

function AssetCard({ asset, onPreview, onSend }: { asset: KnowledgeSearchResult; onPreview: () => void; onSend: () => void }) {
  const reason = disabledReason(asset);
  return (
    <article className="p-4">
      <button type="button" className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onPreview}>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
          {asset.assetType === "ARTICLE" ? <BookOpen className="size-4" /> : <FileText className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{asset.title}</span>
          <span className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <span className="rounded-md bg-secondary px-2 py-0.5 text-primary">{assetTypeLabel(asset)}</span>
            <span>{titleCase(asset.status)}</span>
            <span>{titleCase(asset.visibility)}</span>
          </span>
        </span>
      </button>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{asset.summary ?? asset.description ?? asset.fileName ?? "No summary provided."}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {asset.category && <span className="rounded-md border bg-card px-2 py-1 text-[10px] font-semibold">{asset.category}</span>}
        {asset.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-md border bg-card px-2 py-1 text-[10px] font-semibold">{tag}</span>)}
      </div>
      {reason && <p className="mt-3 text-xs font-semibold text-warning">{reason}</p>}
      <div className="mt-3 flex items-center gap-2">
        <AppButton size="sm" variant="outline" onClick={onPreview}>Preview</AppButton>
        <AppButton size="sm" disabled={Boolean(reason)} onClick={onSend}><Send className="size-3.5" />{asset.assetType === "ARTICLE" ? "Attach PDF" : "Send document"}</AppButton>
      </div>
    </article>
  );
}

function PreviewPanel({ asset, onBack, onSend }: { asset: KnowledgeSearchResult; onBack: () => void; onSend: () => void }) {
  const reason = disabledReason(asset);
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <AppButton size="sm" variant="ghost" onClick={onBack}>Back</AppButton>
        <h3 className="mt-3 font-bold">{asset.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{assetTypeLabel(asset)} · {titleCase(asset.status)} · {titleCase(asset.visibility)}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid aspect-[16/9] place-items-center rounded-xl bg-secondary text-primary">
          {asset.assetType === "ARTICLE" ? <BookOpen className="size-10" /> : <FileText className="size-10" />}
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{asset.summary ?? asset.description ?? "No preview summary is available for this asset."}</p>
        {asset.fileName && <p className="mt-3 rounded-xl border bg-muted/35 p-3 text-xs font-semibold">{asset.fileName} · {fileSize(asset.fileSize)}</p>}
        {asset.fileUrl && asset.fileUrl !== "#" && <AppButton asChild variant="outline" className="mt-4"><a href={asset.fileUrl} target="_blank" rel="noreferrer">Open file <ExternalLink className="size-4" /></a></AppButton>}
        <div className="mt-5 flex flex-wrap gap-1.5">{asset.tags.map((tag) => <span key={tag} className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-primary">{tag}</span>)}</div>
        {reason ? (
          <p className="mt-6 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold leading-5 text-warning">{reason}</p>
        ) : (
          <p className="mt-6 rounded-xl border border-primary/20 bg-secondary px-3 py-2 text-xs font-semibold leading-5 text-primary">
            {asset.assetType === "ARTICLE" ? "Can be sent as PDF." : "Can be sent to the customer."}
          </p>
        )}
      </div>
      <div className="border-t p-4">
        <AppButton className="w-full" disabled={Boolean(reason)} onClick={onSend}><Send className="size-4" />Send to customer</AppButton>
      </div>
    </div>
  );
}

function SendAssetDialog({ asset, open, sending, error, onOpenChange, onSend }: { asset: KnowledgeSearchResult | null; open: boolean; sending: boolean; error?: string | null; onOpenChange: (open: boolean) => void; onSend: (messageText: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-0 shadow-[0_24px_80px_rgba(20,35,27,0.22)]">
          <div className="border-b p-5">
            <DialogTitle className="font-bold">Send knowledge asset</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">Send a short message with the selected article or document attached.</DialogDescription>
          </div>
          {asset && (
            <form className="p-5" onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onSend(String(form.get("messageText") ?? ""));
            }}>
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-sm font-bold">{asset.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{assetTypeLabel(asset)} · {asset.assetType === "ARTICLE" ? "PDF attachment" : asset.fileName ?? "Uploaded document"}</p>
              </div>
              <label className="mt-4 block text-sm font-semibold" htmlFor="knowledge-send-message">Message text</label>
              <textarea id="knowledge-send-message" name="messageText" defaultValue={defaultMessage(asset)} rows={4} className="mt-2 w-full resize-y rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              {error && <p className="mt-3 flex gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold leading-5 text-destructive"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" />{error}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</AppButton>
                <AppButton type="submit" loading={sending} loadingText="Sending">Send</AppButton>
              </div>
            </form>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export function ConversationKnowledgeDrawer({ conversationId, canManage }: { conversationId: string; canManage: boolean }) {
  const profile = useCurrentUser();
  const [query, setQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<KnowledgeSearchResult | null>(null);
  const [sendAsset, setSendAsset] = useState<KnowledgeSearchResult | null>(null);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
  const search = useKnowledgeSearch(profile.data?.activeBusiness?.id, conversationId, query);
  const send = useSendKnowledgeAsset(conversationId);

  const results = search.data ?? [];
  const startSend = (asset: KnowledgeSearchResult) => {
    setSendErrorMessage(null);
    setSendAsset(asset);
  };

  const submitSend = (messageText: string) => {
    if (!sendAsset) return;
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage) {
      setSendErrorMessage("Write a short message before sending this asset.");
      return;
    }
    send.mutate(
      { assetType: sendAsset.assetType as KnowledgeAssetType, assetId: sendAsset.id, messageText: trimmedMessage },
      {
        onSuccess: (result) => {
          if (result.status === "SENT") systemNotify.success("Knowledge asset sent to customer.");
          if (result.status === "QUEUED") systemNotify.info("Document queued", { description: "Document is queued and will send when WhatsApp is connected." });
          if (result.status === "FAILED") {
            setSendErrorMessage(sendError(result.reason));
            return;
          }
          setSendAsset(null);
          setSelectedAsset(null);
        },
        onError: (error) => setSendErrorMessage(getApiErrorMessage(error)),
      },
    );
  };

  if (selectedAsset) {
    return <PreviewPanel asset={selectedAsset} onBack={() => setSelectedAsset(null)} onSend={() => startSend(selectedAsset)} />;
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="border-b p-4">
        <h3 className="font-bold">Knowledge Base</h3>
        <p className="mt-1 text-xs text-muted-foreground">Search published articles and uploaded documents you can send during this conversation.</p>
        <div className="mt-4 flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search knowledge base</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Search articles and documents" />
          </label>
          <AppButton size="icon" variant="outline" aria-label="Filters coming soon" disabled><Filter className="size-4" /></AppButton>
          {canManage && <AppButton asChild size="icon" variant="outline" aria-label="Manage knowledge base"><Link href="/knowledge-base"><Plus className="size-4" /></Link></AppButton>}
        </div>
      </div>
      <div className="min-h-0 flex-1 divide-y overflow-y-auto">
        {search.isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 rounded-xl bg-muted/70" />)}
          </div>
        ) : search.isError ? (
          <AppEmptyState className="m-4 min-h-52 border-0" icon={TriangleAlert} title="Could not load knowledge assets" description={getApiErrorMessage(search.error)} />
        ) : results.length ? (
          results.map((asset) => <AssetCard key={`${asset.assetType}-${asset.id}`} asset={asset} onPreview={() => setSelectedAsset(asset)} onSend={() => startSend(asset)} />)
        ) : (
          <AppEmptyState
            className="m-4 min-h-52 border-0"
            icon={BookOpen}
            title="No matching article or document found"
            description={canManage ? "Create or upload a knowledge asset so your team can send it quickly during conversations." : "No approved knowledge assets are available yet."}
          />
        )}
      </div>
      <SendAssetDialog asset={sendAsset} open={Boolean(sendAsset)} sending={send.isPending} error={sendErrorMessage} onOpenChange={(open) => { if (!open) setSendAsset(null); }} onSend={submitSend} />
    </div>
  );
}
