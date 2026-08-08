"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppErrorState } from "@/components/app-error-state";
import { AppInput } from "@/components/app-input";
import { AllKnowledgeAssetsTable, createKnowledgeAssetRows, type KnowledgeAssetRow } from "@/components/knowledge/hub/all-knowledge-assets-table";
import { DocumentConfirmationDialog, type DocumentConfirmation } from "@/components/knowledge/hub/document-confirmation-dialog";
import { DocumentDetailsPanel } from "@/components/knowledge/hub/document-details-panel";
import { KnowledgeAgentPanel } from "@/components/knowledge/hub/knowledge-agent-panel";
import { NewDocMenu } from "@/components/knowledge/hub/new-doc-menu";
import { RecentDocumentsRow, recentKnowledgeItems, type RecentKnowledgeItem } from "@/components/knowledge/hub/recent-documents-row";
import { UploadDocumentDialog, validateKnowledgeUploadFile } from "@/components/knowledge/hub/upload-document-dialog";
import { KnowledgeEditorDialog, type KnowledgeEditorValue } from "@/components/knowledge/knowledge-editor-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBusinessServices } from "@/hooks/use-business-services";
import {
  useArchiveKnowledgeDocument,
  useCreateKnowledgeArticle,
  useDeleteKnowledgeDocument,
  useDocumentDownload,
  useGenerateStarterArticles,
  useKnowledgeArticles,
  useKnowledgeDocument,
  useKnowledgeDocuments,
  useKnowledgeDocumentVersions,
  useRestoreKnowledgeDocument,
  useRetryKnowledgeProcessing,
  useStreamDraftKnowledgeArticle,
  useUpdateKnowledgeArticle,
  useUpdateKnowledgeArticleStatus,
  useUploadKnowledgeDocument,
} from "@/hooks/use-knowledge";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { systemNotify } from "@/lib/system-notifications";
import { cn } from "@/lib/utils";
import type { KnowledgeArticle, KnowledgeDocument, KnowledgeDraftStreamHandlers, KnowledgeListQuery, KnowledgeVisibility } from "@/types/knowledge";

function parseQuery(params: URLSearchParams): KnowledgeListQuery {
  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "20");
  const sortBy = params.get("sortBy") === "createdAt" ? "createdAt" : "updatedAt";
  const sortOrder = params.get("sortOrder") === "asc" ? "asc" : "desc";
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20,
    search: params.get("search") || undefined,
    status: params.get("status") || "ACTIVE",
    processingStatus: params.get("processingStatus") || undefined,
    sortBy,
    sortOrder,
  };
}

function tagsFromText(value: string) {
  return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function normalizeKnowledgeName(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/\s+/g, " ");
}

function isManagerRole(role?: string | null) {
  return role === "BUSINESS_OWNER" || role === "MANAGER";
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

export function KnowledgeBasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profile = useCurrentUser();
  const businessId = profile.data?.activeBusiness?.id;
  const plan = profile.data?.plan?.code ?? "BASIC";
  const canManage = isManagerRole(profile.data?.membership?.role);
  const aiDraftAllowed = canManage && plan !== "BASIC";
  const [uploadRequest, setUploadRequest] = useState<{ businessId: string; file: File | null; key: string } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{ businessId: string; id: string } | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<KnowledgeAssetRow | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);
  const [confirmation, setConfirmation] = useState<DocumentConfirmation>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [assetPage, setAssetPage] = useState(1);
  const [agentOpen, setAgentOpen] = useState(true);
  const [agentExpanded, setAgentExpanded] = useState(false);
  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const uploadOpen = Boolean(businessId && uploadRequest?.businessId === businessId);
  const selectedDocumentId = selectedDocument && selectedDocument.businessId === businessId ? selectedDocument.id : null;

  const documents = useKnowledgeDocuments(businessId, query);
  const articles = useKnowledgeArticles(businessId, { page: 1, limit: 100, sortBy: "updatedAt", sortOrder: "desc" });
  const services = useBusinessServices(businessId, { status: "active", page: 1, limit: 100, sort: "displayOrder", sortOrder: "asc" });
  const detail = useKnowledgeDocument(businessId, selectedDocumentId);
  const versions = useKnowledgeDocumentVersions(businessId, selectedDocumentId);
  const createArticle = useCreateKnowledgeArticle();
  const updateArticle = useUpdateKnowledgeArticle();
  const updateArticleStatus = useUpdateKnowledgeArticleStatus();
  const generateStarter = useGenerateStarterArticles();
  const draftArticle = useStreamDraftKnowledgeArticle();
  const uploadDocument = useUploadKnowledgeDocument();
  const archiveDocument = useArchiveKnowledgeDocument();
  const restoreDocument = useRestoreKnowledgeDocument();
  const deleteDocument = useDeleteKnowledgeDocument();
  const retryProcessing = useRetryKnowledgeProcessing();
  const downloadDocument = useDocumentDownload();

  const updateQuery = (nextQuery: KnowledgeListQuery) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of ["page", "limit", "search", "status", "processingStatus", "sortBy", "sortOrder"]) next.delete(key);
    for (const [key, value] of Object.entries(nextQuery)) {
      if (value === undefined || value === null || value === "") continue;
      next.set(key, String(value));
    }
    router.replace(`/knowledge-base?${next.toString()}`);
  };

  const items = useMemo(() => documents.data?.items ?? [], [documents.data?.items]);
  const articleItems = useMemo(() => articles.data?.items ?? [], [articles.data?.items]);
  const allRows = useMemo(() => createKnowledgeAssetRows(items, articleItems), [articleItems, items]);
  const visibleRows = useMemo(() => {
    const search = query.search?.trim().toLowerCase();
    if (!search) return allRows;
    return allRows.filter((row) => {
      const text = [
        row.item.title,
        row.kind === "article" ? row.item.summary : row.item.description,
        row.item.category,
        ...(row.item.tags ?? []),
      ].filter(Boolean).join(" ").toLowerCase();
      return text.includes(search);
    });
  }, [allRows, query.search]);
  const recentItems = useMemo(() => recentKnowledgeItems(items, articleItems), [articleItems, items]);
  const loadingAssets = documents.isPending || articles.isPending;
  const assetPageSize = 8;
  const totalAssetPages = Math.max(1, Math.ceil(visibleRows.length / assetPageSize));
  const currentAssetPage = Math.min(assetPage, totalAssetPages);
  const assetPageStart = (currentAssetPage - 1) * assetPageSize;
  const paginatedRows = visibleRows.slice(assetPageStart, assetPageStart + assetPageSize);

  const openArticleEditor = (article: KnowledgeArticle | null = null) => {
    setEditingArticle(article);
    setEditorKey((current) => current + 1);
    setEditorOpen(true);
  };

  const submitDraft = (input: KnowledgeEditorValue, handlers: KnowledgeDraftStreamHandlers) => {
    const topic = input.title.trim();
    if (!topic) return;
    if (!aiDraftAllowed) {
      systemNotify.info("AI article drafting is available on Plus and Premium.");
      return;
    }
    const category = input.category.trim();
    const summary = input.summary.trim();
    const body = input.body.trim();
    draftArticle.mutate(
      {
        input: {
          topic,
          ...(category ? { category } : {}),
          relatedServiceIds: input.relatedServiceIds,
          visibility: input.visibility,
          ...(summary || body ? { customerQuestion: summary || body.slice(0, 500) } : {}),
        },
        handlers,
      },
      {
        onSuccess: (article) => {
          systemNotify.success("AI drafted a new article.", { description: "Review and publish it before sending to customers." });
          if (article) openArticleEditor(article);
        },
        onError: (error) => systemNotify.error("Could not draft article", { description: knowledgeErrorMessage(error) }),
      },
    );
  };

  const saveArticle = (input: KnowledgeEditorValue) => {
    const payload = {
      title: input.title,
      summary: input.summary || null,
      body: input.body,
      category: input.category || null,
      tags: tagsFromText(input.tags),
      relatedServiceIds: input.relatedServiceIds,
      visibility: input.visibility,
      status: editingArticle?.status ?? "DRAFT",
    };
    const options = {
      onSuccess: () => {
        systemNotify.success("Knowledge article saved.");
        setEditorOpen(false);
        setEditingArticle(null);
      },
      onError: (error: unknown) => systemNotify.error("Could not save article", { description: knowledgeErrorMessage(error) }),
    };
    if (editingArticle) {
      updateArticle.mutate({ id: editingArticle.id, input: payload }, options);
      return;
    }
    createArticle.mutate(payload, options);
  };

  const publishArticle = (article: KnowledgeArticle) => {
    updateArticleStatus.mutate(
      { id: article.id, status: "PUBLISHED" },
      {
        onSuccess: () => {
          systemNotify.success("Article published.");
        },
        onError: (error) => systemNotify.error("Could not publish article", { description: knowledgeErrorMessage(error) }),
      },
    );
  };

  const archiveArticle = (article: KnowledgeArticle) => {
    updateArticleStatus.mutate(
      { id: article.id, status: "ARCHIVED" },
      {
        onSuccess: () => systemNotify.success("Article archived."),
        onError: (error) => systemNotify.error("Could not archive article", { description: knowledgeErrorMessage(error) }),
      },
    );
  };

  const selectDocument = (document: KnowledgeDocument) => {
    if (!businessId) return;
    setSelectedDocument({ businessId, id: document.id });
  };
  const selectRecent = (entry: RecentKnowledgeItem) => {
    const row: KnowledgeAssetRow = entry.kind === "article" ? { kind: "article", item: entry.item } : { kind: "document", item: entry.item };
    setSelectedAsset(row);
  };
  const selectRow = (row: KnowledgeAssetRow) => {
    setSelectedAsset(row);
  };
  const duplicateAssetTitle = (title: string) => {
    const normalized = normalizeKnowledgeName(title);
    if (!normalized) return null;
    return allRows.find((row) => normalizeKnowledgeName(row.item.title) === normalized) ?? null;
  };
  const duplicateUploadFile = (file: File) => {
    const normalizedFile = normalizeKnowledgeName(file.name);
    if (!normalizedFile) return null;
    return allRows.find((row) => {
      if (normalizeKnowledgeName(row.item.title) === normalizedFile) return true;
      if (row.kind !== "document") return false;
      return normalizeKnowledgeName(row.item.fileName) === normalizedFile || normalizeKnowledgeName(row.item.originalFileName) === normalizedFile;
    }) ?? null;
  };
  const acceptUploadFile = (file?: File | null) => {
    if (!businessId || !file) return;
    const validationError = validateKnowledgeUploadFile(file);
    if (validationError) {
      systemNotify.error("Document cannot be uploaded", { description: validationError });
      return;
    }
    const duplicate = duplicateUploadFile(file);
    if (duplicate) {
      systemNotify.error("Duplicate knowledge asset", { description: `“${duplicate.item.title}” already exists in this Knowledge Hub.` });
      setSelectedAsset(duplicate);
      return;
    }
    setUploadRequest({ businessId, file, key: `${file.name}-${file.lastModified}` });
  };
  const requestConfirmation = (action: NonNullable<DocumentConfirmation>["action"], document: KnowledgeDocument) => {
    setConfirmation({ action, documentId: document.id, title: document.title });
  };
  const runConfirmedAction = () => {
    if (!confirmation) return;
    const mutation = confirmation.action === "archive"
      ? archiveDocument
      : confirmation.action === "restore"
        ? restoreDocument
        : confirmation.action === "delete"
          ? deleteDocument
          : retryProcessing;
    setPendingAction(confirmation.action);
    mutation.mutate(confirmation.documentId, {
      onSuccess: () => {
        systemNotify.success(
          confirmation.action === "archive" ? "Document archived."
            : confirmation.action === "restore" ? "Document restored."
              : confirmation.action === "delete" ? "Document deleted."
                : "Processing retry queued.",
        );
        if (confirmation.action === "delete") setSelectedDocument(null);
        setConfirmation(null);
        setPendingAction(null);
      },
      onError: (error) => {
        systemNotify.error("Document action failed", { description: getApiErrorMessage(error) });
        setPendingAction(null);
      },
    });
  };

  const download = (document: KnowledgeDocument) => {
    setPendingAction("download");
    downloadDocument.mutate(document.id, {
      onError: (error) => systemNotify.error("Could not download document", { description: getApiErrorMessage(error) }),
      onSettled: () => setPendingAction(null),
    });
  };

  if (profile.isPending) {
    return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8"><Skeleton className="h-[680px] rounded-2xl" /></main>;
  }

  if (!businessId) {
    return <main className="p-6"><AppErrorState title="No active business" description="Select a business to manage Knowledge Hub documents." /></main>;
  }

  return (
    <main
      className="relative h-[calc(100dvh-4.5rem)] overflow-hidden bg-background"
      onDragOver={(event) => {
        if (!canManage) return;
        event.preventDefault();
        setDraggingFile(true);
      }}
      onDragLeave={() => setDraggingFile(false)}
      onDrop={(event) => {
        if (!canManage) return;
        event.preventDefault();
        setDraggingFile(false);
        acceptUploadFile(event.dataTransfer.files?.[0]);
      }}
    >
      <div
        className={cn(
          "grid h-full min-h-0 grid-cols-1 transition-[grid-template-columns] duration-300 ease-out",
          !agentOpen && "lg:grid-cols-[minmax(0,1fr)_56px]",
          agentOpen && !agentExpanded && "lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_500px]",
          agentOpen && agentExpanded && "lg:grid-cols-[minmax(0,1fr)_540px] xl:grid-cols-[minmax(0,1fr)_600px] 2xl:grid-cols-[minmax(0,1fr)_660px]",
        )}
      >
        <section className="min-h-0 min-w-0 overflow-y-auto px-4 py-6 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto w-full max-w-[1040px] space-y-8">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Knowledge Base</h1>
                <p className="mt-2 text-sm text-muted-foreground">Manage your knowledge base and connected sources</p>
              </div>
              <NewDocMenu
                canManage={canManage}
                aiDraftAllowed={aiDraftAllowed}
                generating={generateStarter.isPending}
                onCreateArticle={() => openArticleEditor()}
                onGenerateStarter={() => {
                  generateStarter.mutate(
                    { count: 4 },
                    {
                      onSuccess: () => systemNotify.success("Starter articles generated.", { description: "Review the drafts before publishing." }),
                      onError: (error) => systemNotify.error("Could not generate starter articles", { description: knowledgeErrorMessage(error) }),
                    },
                  );
                }}
              />
            </header>

            {!canManage && (
              <div className="rounded-xl border bg-card p-3 text-sm text-muted-foreground">
                You can view approved knowledge where your workspace permissions allow it. Knowledge management is restricted.
              </div>
            )}

            <RecentDocumentsRow items={recentItems} loading={loadingAssets} onSelect={selectRecent} />

            <section className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-bold">All Documents</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <AppInput
                      value={query.search ?? ""}
                      onChange={(event) => {
                        setAssetPage(1);
                        updateQuery({ ...query, search: event.target.value, page: 1 });
                      }}
                      placeholder="Search"
                      className="h-8 w-48 rounded-lg pl-8 text-xs"
                    />
                  </label>
                  <AppButton
                    size="sm"
                    variant="ghost"
                    className="h-8 min-h-8 px-2 text-xs"
                    onClick={() => {
                      setAssetPage(1);
                      updateQuery({ ...query, sortBy: "updatedAt", sortOrder: query.sortOrder === "asc" ? "desc" : "asc" });
                    }}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    Sort
                  </AppButton>
                  <AppButton size="icon" variant="outline" className="size-8" aria-label="Grid view placeholder"><Grid2X2 className="size-3.5" /></AppButton>
                  <AppButton size="icon" variant="outline" className="size-8" aria-label="List view"><List className="size-3.5" /></AppButton>
                </div>
              </div>

              {(documents.isError || articles.isError) && (
                <AppErrorState title="Could not load knowledge assets" description={getApiErrorMessage(documents.error ?? articles.error)} />
              )}

              {!documents.isError && !articles.isError && (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <AllKnowledgeAssetsTable
                      rows={paginatedRows}
                      loading={loadingAssets}
                      canManage={canManage}
                      onSelect={selectRow}
                      onOpenArticle={openArticleEditor}
                      onPublishArticle={publishArticle}
                      onArchiveArticle={archiveArticle}
                      onOpenDocument={selectDocument}
                      onDownloadDocument={download}
                      onArchiveDocument={(document) => requestConfirmation("archive", document)}
                      onRetryDocument={(document) => requestConfirmation("retry", document)}
                    />
                  </div>
                  {!loadingAssets && visibleRows.length > assetPageSize && (
                    <div className="flex flex-col gap-3 rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        Showing {assetPageStart + 1}-{Math.min(assetPageStart + assetPageSize, visibleRows.length)} of {visibleRows.length} knowledge assets
                      </span>
                      <div className="flex items-center gap-2">
                        <AppButton
                          size="sm"
                          variant="outline"
                          className="h-8 min-h-8 text-xs"
                          disabled={currentAssetPage <= 1}
                          onClick={() => setAssetPage((current) => Math.max(1, current - 1))}
                        >
                          Previous
                        </AppButton>
                        <span className="min-w-16 text-center font-semibold text-foreground">
                          {currentAssetPage} / {totalAssetPages}
                        </span>
                        <AppButton
                          size="sm"
                          variant="outline"
                          className="h-8 min-h-8 text-xs"
                          disabled={currentAssetPage >= totalAssetPages}
                          onClick={() => setAssetPage((current) => Math.min(totalAssetPages, current + 1))}
                        >
                          Next
                        </AppButton>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </section>

        <KnowledgeAgentPanel
          selected={selectedAsset}
          open={agentOpen}
          expanded={agentExpanded}
          onToggleOpen={() => setAgentOpen((current) => !current)}
          onToggleExpanded={() => setAgentExpanded((current) => !current)}
        />
      </div>

      <div className={cn(
        "pointer-events-none absolute inset-4 z-40 grid place-items-center rounded-2xl border border-dashed border-primary bg-secondary/85 text-center opacity-0 transition-opacity",
        draggingFile && "opacity-100",
      )}>
        <div>
          <p className="text-lg font-bold text-primary">Drop to review document</p>
          <p className="mt-1 text-sm text-muted-foreground">BizReply will verify the file before upload.</p>
        </div>
      </div>

      <UploadDocumentDialog
        key={uploadRequest?.key ?? "empty-upload"}
        open={uploadOpen}
        onOpenChange={(open) => setUploadRequest(open ? { businessId, file: uploadRequest?.file ?? null, key: uploadRequest?.key ?? "manual-upload" } : null)}
        busy={uploadDocument.isPending}
        uploadError={uploadDocument.error}
        initialFile={uploadRequest?.file ?? null}
        onUpload={(input) => {
          const duplicate = duplicateAssetTitle(input.title);
          if (duplicate) {
            systemNotify.error("Duplicate knowledge asset", { description: `“${duplicate.item.title}” already exists in this Knowledge Hub.` });
            setSelectedAsset(duplicate);
            return;
          }
          uploadDocument.mutate(
            {
              file: input.file,
              title: input.title,
              description: input.description || null,
              category: input.category || null,
              tags: tagsFromText(input.tags),
              visibility: input.visibility as KnowledgeVisibility,
            },
            {
              onSuccess: (document) => {
                systemNotify.success("Document uploaded.", { description: "Processing has been queued by the backend." });
                setUploadRequest(null);
                setSelectedDocument({ businessId, id: document.id });
              },
              onError: (error) => systemNotify.error("Could not upload document", { description: getApiErrorMessage(error) }),
            },
          );
        }}
      />

      <KnowledgeEditorDialog
        key={editorKey}
        article={editingArticle}
        services={services.data?.items ?? []}
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditingArticle(null);
        }}
        saving={createArticle.isPending || updateArticle.isPending}
        drafting={draftArticle.isPending}
        publishing={updateArticleStatus.isPending}
        canDraftWithAi={aiDraftAllowed}
        onDraft={submitDraft}
        onSave={saveArticle}
        onPublish={editingArticle ? () => publishArticle(editingArticle) : undefined}
      />

      <DocumentDetailsPanel
        open={Boolean(selectedDocumentId)}
        document={detail.data}
        loading={detail.isPending}
        error={detail.error}
        versions={versions.data?.items ?? []}
        pendingAction={pendingAction}
        onClose={() => setSelectedDocument(null)}
        onDownload={() => detail.data && download(detail.data)}
        onArchive={() => detail.data && requestConfirmation("archive", detail.data)}
        onRestore={() => detail.data && requestConfirmation("restore", detail.data)}
        onDelete={() => detail.data && requestConfirmation("delete", detail.data)}
        onRetry={() => detail.data && requestConfirmation("retry", detail.data)}
      />

      <DocumentConfirmationDialog
        confirmation={confirmation}
        loading={Boolean(pendingAction && pendingAction !== "download")}
        onClose={() => setConfirmation(null)}
        onConfirm={runConfirmedAction}
      />
    </main>
  );
}
