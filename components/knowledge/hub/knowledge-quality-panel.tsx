"use client";

import { useId, useRef, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AppButton } from "@/components/app-button";
import { AppInput } from "@/components/app-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useKnowledgeQualityAudit, useResolveKnowledgeQualityFinding } from "@/hooks/use-knowledge";
import { queryKeys } from "@/lib/query-keys";
import { knowledgeService } from "@/services/knowledge-service";
import { businessServiceService } from "@/services/business-service-service";
import { businessPolicyService } from "@/services/business-policy-service";
import type { AuthProfile } from "@/types/auth";
import type { KnowledgeArticle, KnowledgeQualityFinding, KnowledgeQualityFindingCode, ResolveKnowledgeQualityInput } from "@/types/knowledge";

export const qualityFindingLabels: Record<KnowledgeQualityFindingCode, string> = {
  DUPLICATE_CUSTOMER_ARTICLE: "Duplicate customer knowledge",
  CATEGORY_NORMALIZATION_NEEDED: "Category needs review",
  MISSING_RELEVANCE_METADATA: "Missing service or policy relationship",
  POSSIBLE_OUT_OF_DOMAIN_ARTICLE: "Possible unrelated knowledge",
  SUSPICIOUS_RELEVANCE_RELATIONSHIP: "Relationship needs verification",
  STALE_RELEVANCE_RELATIONSHIP: "Outdated relationship",
};
export const qualityConflictMessage = "This finding changed while you were reviewing it. The latest version has been loaded. Please review it again.";

export function canReviewKnowledgeQuality(profile?: Pick<AuthProfile, "membership" | "permissions">) {
  return profile?.membership?.status === "ACTIVE"
    && ["BUSINESS_OWNER", "MANAGER"].includes(profile.membership.role)
    && profile.permissions.includes("knowledge:manage");
}

// Selection must include every page, not only the first 100 entities.
async function allPages<T>(load: (page: number) => Promise<{ items: T[]; pagination: { totalPages: number } }>) {
  const first = await load(1);
  const items = [...first.items];
  for (let page = 2; page <= first.pagination.totalPages; page++) items.push(...(await load(page)).items);
  return items;
}

export function KnowledgeQualityPanel({ businessId, canManage, articles }: {
  businessId: string;
  canManage: boolean;
  articles: KnowledgeArticle[];
}) {
  const audit = useKnowledgeQualityAudit(businessId, canManage);
  const resolve = useResolveKnowledgeQualityFinding(businessId, canManage);
  const [notice, setNotice] = useState("");
  const [epoch, setEpoch] = useState(0);
  const ids = canManage ? [...new Set(audit.data?.findings.flatMap(f => f.articleIds) ?? [])] : [];
  const missing = ids.filter(id => !articles.some(a => a.id === id));
  const details = useQueries({ queries: missing.map(id => ({
    queryKey: queryKeys.knowledgeArticles.detail(businessId, id),
    queryFn: () => knowledgeService.articleDetail(id),
    retry: false,
  })) });
  const availableArticles = [...articles, ...details.flatMap(query => query.data ? [query.data] : [])];
  const submit = async (input: ResolveKnowledgeQualityInput, idempotencyKey: string) => {
    if (!canManage) return;
    setNotice("");
    try {
      const result = await resolve.mutateAsync({ input, idempotencyKey });
      setNotice(result.originalFindingStillAppears
        ? "Review saved. This finding still appears in the latest audit."
        : "Review saved. Knowledge quality has been refreshed.");
      setEpoch(value => value + 1);
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && error.status === 409) {
        setEpoch(value => value + 1);
        setNotice(qualityConflictMessage);
      } else throw error;
    }
  };

  return <section aria-label="Knowledge Quality" className="space-y-3 rounded-xl border bg-card p-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-bold">Knowledge Quality</h2>
      {canManage && audit.data && <p className="text-xs text-muted-foreground">{audit.data.summary.findings} findings · {audit.data.summary.articlesNeedingReview} articles needing review</p>}
      {canManage && audit.data && <AppButton size="sm" variant="ghost" disabled={resolve.isPending || audit.isFetching} onClick={() => { setEpoch(value => value + 1); void audit.refetch(); }}>Refresh audit</AppButton>}
    </header>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {!canManage ? <p className="text-sm text-muted-foreground">Quality review requires Knowledge management access.</p>
      : audit.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading knowledge quality…</p>
      : audit.isError ? <div role="alert" className="space-y-2 text-sm"><p>Could not load knowledge quality. Please try again.</p><AppButton size="sm" variant="outline" onClick={() => void audit.refetch()}>Retry quality audit</AppButton></div>
      : audit.data?.businessId !== businessId ? <p role="alert" className="text-sm">Quality review is unavailable for this workspace.</p>
      : audit.data.findings.length === 0 ? <div><p className="text-sm font-semibold">Knowledge quality looks good</p><p className="mt-1 text-sm text-muted-foreground">No current customer-facing article issues were detected.</p></div>
      : <div className="space-y-3">{audit.data.findings.map(finding => <FindingReview
        key={`${finding.findingKey}:${JSON.stringify(finding.articleRevisions)}:${epoch}`}
        businessId={businessId} finding={finding} articles={availableArticles}
        busy={resolve.isPending || audit.isFetching} onSubmit={submit}
      />)}</div>}
    {canManage && details.some(q => q.isError) && <div className="text-sm text-muted-foreground"><p>Some article titles could not be loaded. Review is unavailable for those articles.</p><AppButton size="sm" variant="ghost" onClick={() => { void Promise.all(details.filter(q => q.isError).map(q => q.refetch())); }}>Retry article details</AppButton></div>}
  </section>;
}

type ArticleAction = Exclude<ResolveKnowledgeQualityInput["action"], "DISMISS">;
function FindingReview({ businessId, finding, articles, busy, onSubmit }: {
  businessId: string; finding: KnowledgeQualityFinding; articles: KnowledgeArticle[]; busy: boolean;
  onSubmit: (input: ResolveKnowledgeQualityInput, idempotencyKey: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [articleId, setArticleId] = useState("");
  const [error, setError] = useState("");
  const request = useRef<{ input: ResolveKnowledgeQualityInput; key: string } | null>(null);
  const submitting = useRef(false);
  const fieldId = useId();
  const action: ArticleAction = finding.code === "CATEGORY_NORMALIZATION_NEEDED" ? "UPDATE_CATEGORY"
    : ["MISSING_RELEVANCE_METADATA", "SUSPICIOUS_RELEVANCE_RELATIONSHIP", "STALE_RELEVANCE_RELATIONSHIP"].includes(finding.code) ? "UPDATE_RELATIONSHIPS" : "ARCHIVE_ARTICLE";
  const article = articles.find(a => a.id === articleId);
  const revision = finding.articleRevisions.find(r => r.articleId === articleId)?.updatedAt;
  const send = async (input?: ResolveKnowledgeQualityInput) => {
    if (busy || submitting.current) return;
    if (input) request.current = { input, key: crypto.randomUUID() };
    if (!request.current) return;
    submitting.current = true;
    setError("");
    try { await onSubmit(request.current.input, request.current.key); }
    catch { setError("Could not save this review. Retry the same action, or cancel and review again."); }
    finally { submitting.current = false; }
  };
  const begin = () => {
    setEditing(true);
    // Duplicates always require an explicit choice; no article is authoritative.
    setArticleId(finding.articleIds.length === 1 && finding.code !== "DUPLICATE_CUSTOMER_ARTICLE" ? finding.articleIds[0] : "");
  };
  return <article className="space-y-2 rounded-lg border p-3">
    <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{qualityFindingLabels[finding.code]}</h3><span className="text-xs text-muted-foreground">{finding.severity === "WARNING" ? "Warning" : "Info"}</span><span className="text-xs text-muted-foreground">{finding.reviewStatus === "DISMISSED" ? "Dismissed" : "Open"}</span></div>
    <ul className="list-inside list-disc text-sm">{finding.articleIds.map(id => <li key={id}>{articles.find(a => a.id === id)?.title ?? "Article title unavailable"}</li>)}</ul>
    <p className="text-sm text-muted-foreground">{finding.suggestedAction}</p>
    {error ? <div role="alert" className="space-y-2 text-sm"><p>{error}</p><AppButton size="sm" variant="outline" disabled={busy} onClick={() => void send()}>Retry same action</AppButton><AppButton size="sm" variant="ghost" disabled={busy} onClick={() => { request.current = null; setError(""); setEditing(false); }}>Cancel review</AppButton></div>
      : finding.reviewStatus === "OPEN" && <>
        {!editing ? <div className="flex flex-wrap gap-2"><AppButton size="sm" variant="outline" disabled={busy} onClick={begin}>{action === "UPDATE_CATEGORY" ? "Review category" : action === "UPDATE_RELATIONSHIPS" ? "Review relationships" : "Choose article to archive"}</AppButton><AppButton size="sm" variant="ghost" disabled={busy} onClick={() => void send({ action: "DISMISS", findingKey: finding.findingKey })}>Dismiss</AppButton></div>
          : <div className="space-y-3 border-t pt-3">
            <label htmlFor={fieldId} className="block text-sm font-medium">Article to review</label>
            <select id={fieldId} value={articleId} disabled={busy} onChange={event => setArticleId(event.target.value)} className="h-10 w-full rounded-lg border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Choose an article</option>
              {finding.articleIds.map(id => <option key={id} value={id} disabled={!articles.some(a => a.id === id)}>{articles.find(a => a.id === id)?.title ?? "Article title unavailable"}</option>)}
            </select>
            {article && !revision && <p role="alert" className="text-sm">The audit revision is unavailable. Refresh the quality audit before reviewing this article.</p>}
            {article && revision && <ArticleReviewEditor key={articleId} businessId={businessId} article={article} action={action} busy={busy}
              onSubmit={fields => void send({ ...fields, findingKey: finding.findingKey, articleId, expectedArticleUpdatedAt: revision })} />}
            <AppButton size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>Cancel review</AppButton>
          </div>}
      </>}
  </article>;
}

type ArticleFields = { action: "UPDATE_CATEGORY"; category: string }
  | { action: "UPDATE_RELATIONSHIPS"; relatedServiceIds: string[]; relatedPolicyIds: string[] }
  | { action: "ARCHIVE_ARTICLE" };
function ArticleReviewEditor({ businessId, article, action, busy, onSubmit }: {
  businessId: string; article: KnowledgeArticle; action: ArticleAction; busy: boolean; onSubmit: (input: ArticleFields) => void;
}) {
  const id = useId();
  const [category, setCategory] = useState(article.category ?? "");
  const [serviceIds, setServiceIds] = useState(article.relatedServiceIds ?? []);
  const [policyIds, setPolicyIds] = useState(article.relatedPolicyIds ?? []);
  const relationships = useQuery({
    queryKey: ["knowledge-quality-relationships", businessId],
    enabled: action === "UPDATE_RELATIONSHIPS",
    retry: false,
    queryFn: async () => {
      const [services, policies] = await Promise.all([
        allPages(page => businessServiceService.list({ status: "active", page, limit: 100, sort: "displayOrder", sortOrder: "asc" })),
        allPages(page => businessPolicyService.list({ status: "active", visibility: "CUSTOMER_FACING", page, limit: 100, sort: "displayOrder", sortOrder: "asc" })),
      ]);
      return { services: services.filter(s => s.isActive && !s.isArchived), policies: policies.filter(p => p.isActive && !p.isArchived && p.visibility === "CUSTOMER_FACING") };
    },
  });
  if (action === "ARCHIVE_ARTICLE") return <ConfirmDialog
    trigger={<AppButton size="sm" variant="destructive" disabled={busy}>Archive article</AppButton>}
    title={`Archive “${article.title}”?`}
    description="This article will stop being available to the customer-facing AI. Other articles will remain unchanged."
    confirmLabel="Confirm archive" loading={busy} onConfirm={() => onSubmit({ action: "ARCHIVE_ARTICLE" })}
  />;
  if (action === "UPDATE_CATEGORY") return <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (category.trim() && !busy) onSubmit({ action, category: category.trim() }); }}>
    <label htmlFor={id} className="block text-sm font-medium">Category</label><AppInput id={id} value={category} maxLength={160} required disabled={busy} onChange={event => setCategory(event.target.value)} />
    <AppButton type="submit" size="sm" disabled={busy || !category.trim()}>Save category</AppButton>
  </form>;
  if (relationships.isPending) return <p role="status" className="text-sm">Loading active services and customer-facing policies…</p>;
  if (relationships.isError || !relationships.data) return <div role="alert" className="text-sm"><p>Could not load relationship choices.</p><AppButton size="sm" variant="outline" onClick={() => void relationships.refetch()}>Retry relationships</AppButton></div>;
  const { services, policies } = relationships.data;
  const selectedServices = serviceIds.filter(id => services.some(s => s.id === id));
  const selectedPolicies = policyIds.filter(id => policies.some(p => p.id === id));
  const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
  return <div className="space-y-3">
    <p className="text-xs text-muted-foreground">Saving replaces all service and policy relationships with the selections below. Unavailable relationships will be removed. Nothing is inferred automatically.</p>
    <fieldset disabled={busy} className="space-y-2"><legend className="text-sm font-medium">Active services</legend>{services.length === 0 && <p className="text-sm text-muted-foreground">No active services.</p>}{services.map(service => <label key={service.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={serviceIds.includes(service.id)} onChange={() => setServiceIds(toggle(serviceIds, service.id))} />{service.name}</label>)}</fieldset>
    <fieldset disabled={busy} className="space-y-2"><legend className="text-sm font-medium">Customer-facing policies</legend>{policies.length === 0 && <p className="text-sm text-muted-foreground">No active customer-facing policies.</p>}{policies.map(policy => <label key={policy.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policyIds.includes(policy.id)} onChange={() => setPolicyIds(toggle(policyIds, policy.id))} />{policy.title}</label>)}</fieldset>
    <AppButton size="sm" disabled={busy || selectedServices.length > 50 || selectedPolicies.length > 50} onClick={() => onSubmit({ action, relatedServiceIds: selectedServices, relatedPolicyIds: selectedPolicies })}>Save relationships</AppButton>
    {(selectedServices.length > 50 || selectedPolicies.length > 50) && <p role="alert" className="text-sm">Select at most 50 services and 50 policies.</p>}
  </div>;
}
