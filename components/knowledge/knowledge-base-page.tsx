"use client";

import { useState } from "react";
import { Archive, BookOpen, FileText, Plus, Sparkles, Upload } from "lucide-react";
import { systemNotify } from "@/lib/system-notifications";
import { AppButton } from "@/components/app-button";
import { AppCard } from "@/components/app-card";
import { AppEmptyState } from "@/components/app-empty-state";
import { AppErrorState } from "@/components/app-error-state";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { KnowledgeEditorDialog, type KnowledgeEditorValue } from "@/components/knowledge/knowledge-editor-dialog";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBusinessServices } from "@/hooks/use-business-services";
import {
  useCreateKnowledgeArticle,
  useGenerateStarterArticles,
  useKnowledgeArticles,
  useKnowledgeDocuments,
  useStreamDraftKnowledgeArticle,
  useUpdateKnowledgeArticle,
  useUpdateKnowledgeArticleStatus,
  useUpdateKnowledgeDocumentStatus,
  useUploadKnowledgeDocument,
} from "@/hooks/use-knowledge";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { KnowledgeArticle, KnowledgeDocument, KnowledgeDraftStreamHandlers, KnowledgeVisibility } from "@/types/knowledge";

type Tab = "articles" | "documents" | "review";

function listItems<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const record = value as { items?: unknown; data?: unknown; articles?: unknown; documents?: unknown };
  if (Array.isArray(record.items)) return record.items as T[];
  if (Array.isArray(record.data)) return record.data as T[];
  if (Array.isArray(record.articles)) return record.articles as T[];
  if (Array.isArray(record.documents)) return record.documents as T[];
  if (record.data && typeof record.data === "object") return listItems<T>(record.data);
  return [];
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function tagsFromText(value: string) {
  return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function knowledgeErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.details) {
    const details = Object.entries(error.details)
      .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
      .join(" ");
    if (details) return details;
  }
  return getApiErrorMessage(error);
}

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "primary" | "warning" }) {
  return <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold", tone === "primary" && "border-primary/20 bg-secondary text-primary", tone === "warning" && "border-warning/20 bg-warning/10 text-warning")}>{children}</span>;
}

function UploadDialog({ open, onOpenChange, onUpload, busy }: { open: boolean; onOpenChange: (open: boolean) => void; onUpload: (input: { file: File; title: string; description: string; category: string; tags: string; visibility: KnowledgeVisibility }) => void; busy: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<KnowledgeVisibility>("CLIENT_SENDABLE");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-0 shadow-[0_24px_80px_rgba(20,35,27,0.22)]">
          <div className="border-b p-5"><DialogTitle className="font-bold">Upload document</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">Upload PDFs, brochures, policies, or company profiles for your team to send.</DialogDescription></div>
          <form className="space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); if (file) onUpload({ file, title, description, category, tags, visibility }); }}>
            <label className="block text-sm font-semibold">File<input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-xl border bg-background p-3 text-sm" required /></label>
            <Field label="Title" value={title} onChange={setTitle} placeholder="Company profile" required />
            <Field label="Description" value={description} onChange={setDescription} placeholder="Short description for your team." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" value={category} onChange={setCategory} placeholder="Company" />
              <label className="block text-sm font-semibold">Visibility<select value={visibility} onChange={(event) => setVisibility(event.target.value as KnowledgeVisibility)} className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="CLIENT_SENDABLE">Client Sendable</option><option value="INTERNAL_ONLY">Internal Only</option></select></label>
            </div>
            <Field label="Tags" value={tags} onChange={setTags} placeholder="PDF, Profile" />
            <div className="flex justify-end gap-2 border-t pt-4"><AppButton type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</AppButton><AppButton type="submit" loading={busy} loadingText="Uploading" disabled={!file || !title.trim()}>Upload document</AppButton></div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

function Field({ label, value, onChange, placeholder, multiline, required }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold">
      {label}{required && <span className="text-destructive"> *</span>}
      {multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={6} placeholder={placeholder} className="mt-2 w-full resize-y rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />}
    </label>
  );
}

function ArticleCard({ article, canManage, onEdit, onPublish, onArchive, busy }: { article: KnowledgeArticle; canManage: boolean; onEdit: () => void; onPublish: () => void; onArchive: () => void; busy: boolean }) {
  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="font-bold">{article.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{article.summary ?? "No summary provided."}</p></div>
        <div className="flex flex-wrap gap-1.5"><Badge tone={article.status === "NEEDS_REVIEW" ? "warning" : article.status === "PUBLISHED" ? "primary" : "default"}>{titleCase(article.status)}</Badge><Badge>{titleCase(article.source)}</Badge><Badge>{titleCase(article.visibility)}</Badge></div>
      </div>
      {article.aiGenerated && <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-primary">AI draft: {article.aiDraftReason ?? "Review before publishing."}{typeof article.aiConfidence === "number" ? ` Confidence ${Math.round(article.aiConfidence * 100)}%.` : ""}</p>}
      <div className="mt-4 flex flex-wrap gap-1.5">{article.tags.map((tag) => <span key={tag} className="rounded-md border px-2 py-1 text-[11px] font-semibold">{tag}</span>)}</div>
      {canManage && <div className="mt-4 flex justify-end gap-2 border-t pt-3"><AppButton size="sm" variant="outline" onClick={onEdit}>Review / edit</AppButton>{article.status !== "PUBLISHED" && <AppButton size="sm" loading={busy} onClick={onPublish}>Publish</AppButton>}{article.status !== "ARCHIVED" && <AppButton size="sm" variant="outline" loading={busy} onClick={onArchive}><Archive className="size-3.5" />Archive</AppButton>}</div>}
    </article>
  );
}

function DocumentCard({ document, canManage, onArchive, busy }: { document: KnowledgeDocument; canManage: boolean; onArchive: () => void; busy: boolean }) {
  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="font-bold">{document.title}</h3><p className="mt-1 text-sm text-muted-foreground">{document.description ?? document.fileName}</p></div>
        <div className="flex flex-wrap gap-1.5"><Badge tone={document.status === "ACTIVE" ? "primary" : "default"}>{titleCase(document.status)}</Badge><Badge>{titleCase(document.visibility)}</Badge></div>
      </div>
      <p className="mt-3 rounded-xl bg-muted/45 px-3 py-2 text-xs font-semibold">{document.fileName}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">{document.tags.map((tag) => <span key={tag} className="rounded-md border px-2 py-1 text-[11px] font-semibold">{tag}</span>)}</div>
      {canManage && document.status !== "ARCHIVED" && <div className="mt-4 flex justify-end border-t pt-3"><AppButton size="sm" variant="outline" loading={busy} onClick={onArchive}><Archive className="size-3.5" />Archive</AppButton></div>}
    </article>
  );
}

export function KnowledgeBasePage() {
  const profile = useCurrentUser();
  const businessId = profile.data?.activeBusiness?.id;
  const canManage = profile.data?.membership?.role !== "STAFF";
  const plan = profile.data?.plan?.code ?? "BASIC";
  const [tab, setTab] = useState<Tab>("articles");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const articles = useKnowledgeArticles(businessId, { limit: 100 });
  const documents = useKnowledgeDocuments(businessId, { limit: 100 });
  const services = useBusinessServices(businessId, { status: "active", page: 1, limit: 100, sort: "displayOrder", sortOrder: "asc" });
  const createArticle = useCreateKnowledgeArticle();
  const draftArticle = useStreamDraftKnowledgeArticle();
  const generateStarter = useGenerateStarterArticles();
  const updateArticle = useUpdateKnowledgeArticle();
  const updateArticleStatus = useUpdateKnowledgeArticleStatus();
  const uploadDocument = useUploadKnowledgeDocument();
  const updateDocumentStatus = useUpdateKnowledgeDocumentStatus();
  const articleItems = listItems<KnowledgeArticle>(articles.data);
  const documentItems = listItems<KnowledgeDocument>(documents.data);
  const reviewArticles = articleItems.filter((article) => article.status === "NEEDS_REVIEW");

  if (profile.isPending) return <main className="p-6"><Skeleton className="h-[680px] rounded-2xl" /></main>;
  if (!businessId) return <main className="p-6"><AppErrorState title="No active business" description="Select a business to manage knowledge assets." /></main>;

  const aiDraftAllowed = plan !== "BASIC" && canManage;
  const openEditor = (article: KnowledgeArticle | null) => {
    setEditingArticle(article);
    setEditorKey((current) => current + 1);
    setEditorOpen(true);
  };
  const submitDraft = (input: KnowledgeEditorValue, handlers: KnowledgeDraftStreamHandlers) => {
    const topic = input.title.trim();
    if (!topic) return;
    if (!aiDraftAllowed) {
      systemNotify.info("AI article drafting is available on Plus and Premium.", { description: canManage ? "Upgrade to Plus to let AI draft knowledge articles for review." : "Contact your organization to upgrade." });
      return;
    }
    const category = input.category.trim();
    const summary = input.summary.trim();
    const body = input.body.trim();
    const draftInput = {
        topic,
        ...(category ? { category } : {}),
        relatedServiceIds: input.relatedServiceIds,
        visibility: input.visibility,
        ...(summary || body ? { customerQuestion: summary || body.slice(0, 500) } : {}),
      };
    draftArticle.mutate(
      { input: draftInput, handlers },
      {
        onSuccess: (article) => {
          systemNotify.success("AI drafted a new article. Review it before publishing.");
          setTab("review");
          if (article) setEditingArticle(article);
        },
        onError: (error) => systemNotify.error("Could not draft article", { description: knowledgeErrorMessage(error) }),
      },
    );
  };

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Knowledge Base</h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">Manage AI draft articles, manual articles, and uploaded documents your team can use during customer conversations.</p></div>
          {canManage && <div className="flex flex-wrap gap-2">
              <AppButton variant="outline" onClick={() => openEditor(null)}>
              <Plus className="size-4" />Create article</AppButton>
              <AppButton variant="outline" onClick={() => setUploadOpen(true)}>
              <Upload className="size-4" />Upload document</AppButton>
              <AppButton disabled={!aiDraftAllowed} onClick={() => generateStarter.mutate({ count: 4 },
              { onSuccess: () => { systemNotify.success("AI drafted new knowledge articles. Review and publish them before sending to customers.");
              setTab("review"); }, onError: (error) => systemNotify.error("Could not generate starter articles", { description: knowledgeErrorMessage(error) }) })}>
                <Sparkles className="size-4" />Generate starter articles</AppButton>
          </div>}
      </header>
      {plan === "BASIC" && <AppCard className="mt-6 border-warning/20 bg-warning/10 shadow-none"><p className="text-sm font-bold text-warning">AI article drafting is available on Plus and Premium.</p><p className="mt-1 text-sm text-muted-foreground">Manual knowledge assets remain available when your plan and backend limits allow them.</p></AppCard>}
      <nav className="mt-6 flex overflow-x-auto border-b" aria-label="Knowledge tabs">{(["articles", "documents", "review"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={cn("min-h-12 shrink-0 border-b-2 border-transparent px-4 text-sm font-semibold capitalize text-muted-foreground", tab === item && "border-primary text-primary")}>{item === "review" ? `Needs Review ${reviewArticles.length}` : item}</button>)}</nav>
      <section className="mt-6">
        {(articles.isPending || documents.isPending) && <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-44 rounded-2xl" />)}</div>}
        {(articles.isError || documents.isError) && <AppErrorState title="Could not load knowledge base" description={getApiErrorMessage(articles.error ?? documents.error)} />}
        {!articles.isPending && !documents.isPending && !articles.isError && !documents.isError && tab === "articles" && (articleItems.length ? <div className="grid gap-4 md:grid-cols-2">{articleItems.map((article) => <ArticleCard key={article.id} article={article} canManage={canManage} busy={updateArticleStatus.isPending} onEdit={() => openEditor(article)} onPublish={() => updateArticleStatus.mutate({ id: article.id, status: "PUBLISHED" }, { onSuccess: (updated) => { systemNotify.success("Article published"); openEditor(updated); }, onError: (error) => systemNotify.error("Could not publish article", { description: getApiErrorMessage(error) }) })} onArchive={() => updateArticleStatus.mutate({ id: article.id, status: "ARCHIVED" }, { onSuccess: () => systemNotify.success("Article archived"), onError: (error) => systemNotify.error("Could not archive article", { description: getApiErrorMessage(error) }) })} />)}</div> : <AppEmptyState icon={BookOpen} title="No knowledge articles yet" description="Create one manually or let AI draft starter articles for review." />)}
        {!articles.isPending && !documents.isPending && !articles.isError && !documents.isError && tab === "documents" && (documentItems.length ? <div className="grid gap-4 md:grid-cols-2">{documentItems.map((document) => <DocumentCard key={document.id} document={document} canManage={canManage} busy={updateDocumentStatus.isPending} onArchive={() => updateDocumentStatus.mutate({ id: document.id, status: "ARCHIVED" }, { onSuccess: () => systemNotify.success("Document archived"), onError: (error) => systemNotify.error("Could not archive document", { description: getApiErrorMessage(error) }) })} />)}</div> : <AppEmptyState icon={FileText} title="No uploaded documents yet" description="Upload brochures, price lists, policies, or company profiles for your team to send." />)}
        {!articles.isPending && !documents.isPending && !articles.isError && !documents.isError && tab === "review" && (reviewArticles.length ? <div className="grid gap-4 md:grid-cols-2">{reviewArticles.map((article) => <ArticleCard key={article.id} article={article} canManage={canManage} busy={updateArticleStatus.isPending} onEdit={() => openEditor(article)} onPublish={() => updateArticleStatus.mutate({ id: article.id, status: "PUBLISHED" }, { onSuccess: (updated) => { systemNotify.success("Article published"); openEditor(updated); }, onError: (error) => systemNotify.error("Could not publish article", { description: getApiErrorMessage(error) }) })} onArchive={() => updateArticleStatus.mutate({ id: article.id, status: "ARCHIVED" }, { onSuccess: () => systemNotify.success("Article archived"), onError: (error) => systemNotify.error("Could not archive article", { description: getApiErrorMessage(error) }) })} />)}</div> : <AppEmptyState icon={Sparkles} title="No AI-drafted articles need review" description="Generate starter articles when you want AI to prepare drafts for your team." />)}
      </section>
      <KnowledgeEditorDialog
        key={editorKey}
        article={editingArticle}
        services={services.data?.items ?? []}
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditingArticle(null);
        }}
        saving={updateArticle.isPending || createArticle.isPending}
        drafting={draftArticle.isPending}
        publishing={updateArticleStatus.isPending}
        canDraftWithAi={aiDraftAllowed}
        onDraft={submitDraft}
        onSave={(input) => {
          const payload = {
            title: input.title,
            summary: input.summary || null,
            body: input.body,
            category: input.category || null,
            tags: tagsFromText(input.tags),
            relatedServiceIds: input.relatedServiceIds,
            visibility: input.visibility,
          };
          if (editingArticle) {
            updateArticle.mutate(
              { id: editingArticle.id, input: payload },
              {
                onSuccess: () => {
                  systemNotify.success("Article changes saved.");
                  setEditorOpen(false);
                  setEditingArticle(null);
                },
                onError: (error) => systemNotify.error("Could not save article", { description: getApiErrorMessage(error) }),
              },
            );
            return;
          }
          createArticle.mutate(
            { ...payload, status: "DRAFT" },
            {
              onSuccess: () => {
                systemNotify.success("Knowledge article saved.");
                setEditorOpen(false);
                setEditingArticle(null);
                setTab("articles");
              },
              onError: (error) => systemNotify.error("Could not save article", { description: getApiErrorMessage(error) }),
            },
          );
        }}
        onPublish={() => {
          if (!editingArticle) return;
          updateArticleStatus.mutate(
            { id: editingArticle.id, status: "PUBLISHED" },
            {
              onSuccess: (updated) => {
                systemNotify.success("Article published");
                setEditingArticle(updated);
                setTab("articles");
              },
              onError: (error) => systemNotify.error("Could not publish article", { description: getApiErrorMessage(error) }),
            },
          );
        }}
      />
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} busy={uploadDocument.isPending} onUpload={(input) => uploadDocument.mutate({ file: input.file, title: input.title, description: input.description || null, category: input.category || null, tags: tagsFromText(input.tags), visibility: input.visibility }, { onSuccess: () => { systemNotify.success("Document uploaded successfully."); setUploadOpen(false); }, onError: (error) => systemNotify.error("Could not upload document", { description: getApiErrorMessage(error) }) })} />
    </main>
  );
}
