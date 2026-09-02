"use client";

import { Archive, BookOpen, CheckCircle2, Edit3, FileText, Sparkles } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppEmptyState } from "@/components/app-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KnowledgeArticle, KnowledgeArticleStatus } from "@/types/knowledge";
import { formatKnowledgeDate, titleCase } from "./knowledge-hub-utils";

function articleStatusClass(status: KnowledgeArticleStatus) {
  if (status === "PUBLISHED") return "text-success";
  if (status === "NEEDS_REVIEW") return "text-warning";
  if (status === "ARCHIVED") return "text-muted-foreground";
  return "text-primary";
}

export function ArticleStatusText({ status }: { status: KnowledgeArticleStatus }) {
  return <span className={cn("text-xs font-bold", articleStatusClass(status))}>{titleCase(status)}</span>;
}

export function ArticleCard({
  article,
  canManage,
  busy,
  onEdit,
  onPublish,
  onArchive,
}: {
  article: KnowledgeArticle;
  canManage: boolean;
  busy?: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
}) {
  const canPublish = canManage && article.status !== "PUBLISHED" && article.status !== "ARCHIVED";
  const canArchive = canManage && article.status !== "ARCHIVED";

  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/20">
      <div className="flex items-start justify-between gap-4">
        <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            {article.aiGenerated ? <Sparkles className="size-5" /> : <BookOpen className="size-5" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-foreground">{article.title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              <ArticleStatusText status={article.status} />
              <span>{titleCase(article.visibility)}</span>
              <span>{article.source === "AI_DRAFT" ? "AI draft" : titleCase(article.source)}</span>
              <span>Updated {formatKnowledgeDate(article.updatedAt)}</span>
            </span>
          </span>
        </button>
        {canManage && (
          <AppButton size="icon" variant="ghost" onClick={onEdit} aria-label="Edit article">
            <Edit3 className="size-4" />
          </AppButton>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {article.summary || article.body || "No summary provided yet."}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {article.category && <span className="rounded-md border bg-background px-2 py-1 text-[10px] font-semibold">{article.category}</span>}
        {article.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-md border bg-background px-2 py-1 text-[10px] font-semibold">{tag}</span>)}
      </div>

      {canManage && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {canArchive && (
            <AppButton size="sm" variant="outline" loading={busy} onClick={onArchive}>
              <Archive className="size-4" />
              Archive
            </AppButton>
          )}
          {canPublish && (
            <AppButton size="sm" loading={busy} onClick={onPublish}>
              <CheckCircle2 className="size-4" />
              Publish
            </AppButton>
          )}
        </div>
      )}
    </article>
  );
}

export function ArticleGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-44 rounded-2xl" />)}
    </div>
  );
}

export function EmptyArticles({ reviewOnly }: { reviewOnly?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-10">
      <AppEmptyState
        icon={FileText}
        title={reviewOnly ? "No articles need review" : "No articles found"}
        description={reviewOnly ? "AI drafts and unpublished review items will appear here." : "Create an article manually or generate starter articles with AI."}
      />
    </div>
  );
}
