"use client";

import { useState } from "react";
import { AlertTriangle, Brain, CheckCircle2, ChevronDown, ChevronUp, FileSearch, ShieldAlert, XCircle } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppErrorState } from "@/components/app-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KnowledgeDocument, KnowledgeDocumentReviewDetails } from "@/types/knowledge";
import { hasDocumentAction, titleCase } from "./knowledge-hub-utils";

function confidenceLabel(value?: number | null) {
  if (value === null || value === undefined) return null;
  const percentage = value <= 1 ? value * 100 : value;
  return `${Math.round(percentage)}% confidence`;
}

function AnalysisValue({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm leading-5 text-foreground">{value}</dd>
    </div>
  );
}

export function DocumentReviewPanel({
  document,
  review,
  loading,
  error,
  approving,
  rejecting,
  onRetry,
  onApprove,
  onReject,
}: {
  document: KnowledgeDocument;
  review?: KnowledgeDocumentReviewDetails;
  loading?: boolean;
  error?: unknown;
  approving?: boolean;
  rejecting?: boolean;
  onRetry: () => void;
  onApprove: (note?: string) => void;
  onReject: (reason: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const analysis = document.activeVersion?.analysis;
  const extraction = document.activeVersion?.extraction;
  const canApprove = hasDocumentAction(document, "APPROVE_REVIEW");
  const canReject = hasDocumentAction(document, "REJECT_REVIEW");
  const needsReview = document.processingStatus === "NEEDS_REVIEW" || document.governanceStatus === "REVIEW_REQUIRED";
  const unresolved = review?.summary.unresolved ?? 0;

  if (!needsReview && !analysis) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40">
      <button type="button" className="flex w-full items-start justify-between gap-4 p-4 text-left" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span className="flex min-w-0 gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><FileSearch className="size-4" /></span>
          <span>
            <span className="block text-sm font-bold">{needsReview ? "Human review required" : "Document analysis"}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {needsReview ? "Check what BizReply extracted and decide whether this version can be approved." : "See what BizReply identified in this document."}
            </span>
          </span>
        </span>
        {expanded ? <ChevronUp className="mt-1 size-4 shrink-0" /> : <ChevronDown className="mt-1 size-4 shrink-0" />}
      </button>

      {!expanded && (
        <div className="px-4 pb-4">
          <AppButton size="sm" onClick={() => setExpanded(true)}>
            <FileSearch className="size-4" />{needsReview ? "Review document" : "View analysis"}
          </AppButton>
        </div>
      )}

      {expanded && (
        <div className="space-y-5 border-t border-amber-200 bg-card p-4">
          {loading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div>}
          {!loading && Boolean(error) && <AppErrorState className="min-h-48" title="Could not load review details" description={error instanceof Error ? error.message : "Try loading this review again."} onRetry={onRetry} />}

          {!loading && !error && (
            <>
              <div className="rounded-xl border bg-muted/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="flex items-center gap-2 text-sm font-bold"><Brain className="size-4 text-primary" />AI analysis</h4>
                  {confidenceLabel(analysis?.analysisConfidence) && <span className="text-[11px] font-semibold text-muted-foreground">{confidenceLabel(analysis?.analysisConfidence)}</span>}
                </div>
                {analysis?.shortSummary ? <p className="mt-3 text-sm leading-6 text-foreground">{analysis.shortSummary}</p> : <p className="mt-3 text-sm text-muted-foreground">No analysis summary was returned for this version.</p>}
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <AnalysisValue label="Suggested title" value={analysis?.suggestedTitle} />
                  <AnalysisValue label="Document type" value={analysis?.detectedDocumentType} />
                  <AnalysisValue label="Purpose" value={analysis?.detectedPurpose} />
                  <AnalysisValue label="Likely audience" value={analysis?.likelyAudience} />
                  <AnalysisValue label="Classification" value={analysis?.recommendedClassification} />
                  <AnalysisValue label="Language" value={extraction?.language} />
                </dl>
                {analysis?.topics?.length ? <div className="mt-4 flex flex-wrap gap-1.5">{analysis.topics.map((topic) => <span key={topic} className="rounded-full bg-secondary px-2 py-1 text-[11px] font-semibold text-primary">{topic}</span>)}</div> : null}
                {analysis?.warnings?.length ? (
                  <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    <p className="font-bold">Analysis warnings</p>
                    {analysis.warnings.map((warning) => <p key={warning} className="mt-1">{warning}</p>)}
                  </div>
                ) : null}
              </div>

              {review && (
                <div className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold">Review checks</h4>
                    <span className={cn("text-xs font-bold", unresolved ? "text-amber-700" : "text-emerald-700")}>{unresolved} unresolved</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {review.summary.total === 0
                      ? "No conflicts with current business settings were found."
                      : `${review.summary.total} check${review.summary.total === 1 ? "" : "s"} found${review.summary.stale ? `, including ${review.summary.stale} stale` : ""}.`}
                  </p>
                  {review.reviews.length > 0 && (
                    <div className="mt-3 divide-y rounded-lg border">
                      {review.reviews.slice(0, 5).map((item) => (
                        <div key={item.id} className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold">{item.fact?.label || titleCase(item.comparisonType)}</p>
                            <span className={cn("text-[10px] font-bold uppercase", item.priority === "CRITICAL" ? "text-destructive" : "text-amber-700")}>{titleCase(item.priority)}</span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.fact?.valueText || item.fact?.sourceExcerpt || "This item needs a detailed governance decision."}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {unresolved > 0 && (
                    <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                      Resolve the outstanding checks in the detailed review workflow before approving this document.
                    </div>
                  )}
                </div>
              )}

              {analysis?.facts?.length ? (
                <div className="rounded-xl border p-4">
                  <h4 className="text-sm font-bold">Extracted information</h4>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">A read-only sample of the facts BizReply identified in this version.</p>
                  <dl className="mt-3 divide-y">
                    {analysis.facts.slice(0, 6).map((fact) => (
                      <div key={fact.id} className="grid grid-cols-[minmax(100px,0.7fr)_minmax(0,1fr)] gap-3 py-2.5 text-xs">
                        <dt className="font-semibold text-muted-foreground">{fact.label || titleCase(fact.factType || "Fact")}</dt>
                        <dd className="break-words text-foreground">{fact.valueText || fact.sourceExcerpt || "Value unavailable"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {(canApprove || canReject) && (
                <div className="space-y-4 border-t pt-5">
                  {canApprove && (
                    <div>
                      <label htmlFor="knowledge-review-note" className="text-sm font-bold">Approval note <span className="font-normal text-muted-foreground">(optional)</span></label>
                      <textarea id="knowledge-review-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} className="mt-2 w-full resize-y rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Add context for this approval." />
                      <AppButton className="mt-3 w-full" onClick={() => onApprove(note.trim() || undefined)} loading={approving} disabled={rejecting || unresolved > 0}>
                        <CheckCircle2 className="size-4" />Approve current version
                      </AppButton>
                    </div>
                  )}

                  {canReject && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                      <div className="flex gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p><span className="font-bold">Rejecting is not deletion.</span> The backend will archive this document so it is not used as active knowledge.</p></div>
                      <label htmlFor="knowledge-rejection-reason" className="mt-4 block text-sm font-bold">Reason for rejection</label>
                      <textarea id="knowledge-rejection-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} className="mt-2 w-full resize-y rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Explain what is incorrect or unsuitable (minimum 3 characters)." />
                      <AppButton className="mt-3 w-full" variant="destructive" onClick={() => onReject(reason.trim())} loading={rejecting} disabled={approving || reason.trim().length < 3}>
                        <XCircle className="size-4" />Reject review
                      </AppButton>
                    </div>
                  )}
                </div>
              )}

              {needsReview && !canApprove && !canReject && (
                <p className="rounded-xl bg-muted p-4 text-sm leading-6 text-muted-foreground">You can inspect this review, but your current access does not allow review decisions.</p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
