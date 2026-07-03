import { apiRequest, ApiError } from "@/lib/api-client";
import { businessStore } from "@/lib/business-store";
import { env } from "@/lib/env";
import { tokenStore } from "@/lib/token-store";
import { mockKnowledgeService } from "@/services/mock-knowledge-service";
import type {
  DraftKnowledgeArticleInput,
  KnowledgeDraftStreamHandlers,
  KnowledgeDraftStreamError,
  GenerateStarterArticlesInput,
  KnowledgeArticle,
  KnowledgeArticleInput,
  KnowledgeArticleStatus,
  KnowledgeDocument,
  KnowledgeDocumentInput,
  KnowledgeDocumentStatus,
  KnowledgeListQuery,
  KnowledgeListResponse,
  KnowledgeSearchResult,
  KnowledgeSendInput,
  KnowledgeSendResponse,
  UpdateKnowledgeArticleInput,
} from "@/types/knowledge";

function queryString(query: object) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params.toString();
}

function unwrapArticle(value: unknown): KnowledgeArticle {
  if (value && typeof value === "object") {
    const record = value as { article?: unknown; data?: unknown };
    if (record.article && typeof record.article === "object") return record.article as KnowledgeArticle;
    if (record.data && typeof record.data === "object") return unwrapArticle(record.data);
  }
  return value as KnowledgeArticle;
}

function listItems<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as { items?: unknown; data?: unknown; articles?: unknown; documents?: unknown };
    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.data)) return record.data as T[];
    if (record.data && typeof record.data === "object") return listItems<T>(record.data);
    if (Array.isArray(record.articles)) return record.articles as T[];
    if (Array.isArray(record.documents)) return record.documents as T[];
  }
  return [];
}

function articleSearchResult(article: KnowledgeArticle): KnowledgeSearchResult {
  return {
    assetType: "ARTICLE",
    id: article.id,
    title: article.title,
    summary: article.summary,
    category: article.category,
    tags: article.tags ?? [],
    status: article.status,
    visibility: article.visibility,
    canSendToClient: article.status === "PUBLISHED" && article.visibility === "CLIENT_SENDABLE",
    source: article.source,
  };
}

function documentSearchResult(document: KnowledgeDocument): KnowledgeSearchResult {
  return {
    assetType: "DOCUMENT",
    id: document.id,
    title: document.title,
    description: document.description,
    category: document.category,
    tags: document.tags ?? [],
    status: document.status,
    visibility: document.visibility,
    canSendToClient: document.status === "ACTIVE" && document.visibility === "CLIENT_SENDABLE",
    fileName: document.fileName,
    fileUrl: document.fileUrl,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
  };
}

function normalizeSearchResult(value: unknown): KnowledgeSearchResult | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    assetType?: string;
    type?: string;
    article?: KnowledgeArticle;
    document?: KnowledgeDocument;
  };
  if (record.assetType === "ARTICLE" || record.assetType === "DOCUMENT") return record as KnowledgeSearchResult;
  if (record.article) return articleSearchResult(record.article);
  if (record.document) return documentSearchResult(record.document);
  return null;
}

function normalizeSearchResponse(value: unknown): KnowledgeSearchResult[] {
  return listItems<unknown>(value).map(normalizeSearchResult).filter(Boolean) as KnowledgeSearchResult[];
}

async function defaultKnowledgeAssets() {
  const [articles, documents] = await Promise.all([
    apiRequest<unknown>(`/business/knowledge/articles?${queryString({ status: "PUBLISHED", visibility: "CLIENT_SENDABLE", limit: 8 })}`),
    apiRequest<unknown>(`/business/knowledge/documents?${queryString({ status: "ACTIVE", visibility: "CLIENT_SENDABLE", limit: 8 })}`),
  ]);
  return [
    ...listItems<KnowledgeArticle>(articles).map(articleSearchResult),
    ...listItems<KnowledgeDocument>(documents).map(documentSearchResult),
  ].slice(0, 10);
}

function knowledgeSendBody(input: KnowledgeSendInput) {
  return input.assetType === "ARTICLE"
    ? { assetType: "ARTICLE_PDF", articleId: input.assetId, note: input.messageText }
    : { assetType: "UPLOADED_DOCUMENT", documentId: input.assetId, note: input.messageText };
}

function parseErrorBody(body: unknown, fallback: { code: string; message: string; status: number }) {
  const error = body && typeof body === "object" && "error" in body ? (body as { error?: { code?: string; message?: string; details?: Record<string, string[]> } }).error : undefined;
  return new ApiError(error?.code ?? fallback.code, error?.message ?? fallback.message, fallback.status, error?.details);
}

function sseEventName(raw: string) {
  return raw.split("\n").find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
}

function sseEventData(raw: string) {
  const data = raw.split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!data) return {};
  return JSON.parse(data) as Record<string, unknown>;
}

async function streamDraftArticle(input: DraftKnowledgeArticleInput, handlers: KnowledgeDraftStreamHandlers = {}) {
  if (env.useMockApi) {
    const article = await mockKnowledgeService.draftArticle(input);
    handlers.onStarted?.({ status: "started", message: "AI is drafting the article..." });
    for (const token of article.body.match(/.{1,12}/g) ?? [article.body]) {
      await new Promise((resolve) => setTimeout(resolve, 35));
      handlers.onDelta?.(token);
    }
    handlers.onMetadata?.({
      title: article.title,
      summary: article.summary ?? undefined,
      category: article.category,
      tags: article.tags,
      visibility: article.visibility,
      status: article.status,
      source: article.source,
      aiGenerated: article.aiGenerated,
      aiConfidence: article.aiConfidence,
      aiDraftReason: article.aiDraftReason,
    });
    handlers.onSaved?.({ articleId: article.id, status: article.status, source: article.source, aiGenerated: article.aiGenerated });
    handlers.onCompleted?.({ success: true, articleId: article.id });
    return article;
  }

  const accessToken = tokenStore.getAccessToken();
  const activeBusinessId = businessStore.get();
  const response = await fetch(`${env.apiUrl}/business/knowledge/articles/draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(activeBusinessId ? { "X-Business-Id": activeBusinessId } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => null);
    throw parseErrorBody(body, { code: "AI_DRAFT_STREAM_FAILED", message: "AI could not draft the article. Please try again.", status: response.status });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let articleId: string | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const rawEvent of events) {
      if (!rawEvent.trim()) continue;
      const event = sseEventName(rawEvent);
      const data = sseEventData(rawEvent);
      if (event === "draft_started") handlers.onStarted?.(data);
      if (event === "draft_delta" && typeof data.delta === "string") handlers.onDelta?.(data.delta);
      if (event === "draft_metadata") handlers.onMetadata?.(data);
      if (event === "draft_saved") {
        articleId = typeof data.articleId === "string" ? data.articleId : articleId;
        handlers.onSaved?.(data);
      }
      if (event === "draft_completed") {
        articleId = typeof data.articleId === "string" ? data.articleId : articleId;
        handlers.onCompleted?.(data);
      }
      if (event === "draft_error") {
        handlers.onError?.(data as KnowledgeDraftStreamError);
        throw new ApiError(
          typeof data.reason === "string" ? data.reason : "AI_DRAFT_STREAM_FAILED",
          typeof data.message === "string" ? data.message : "AI could not draft the article. Please try again.",
          502,
        );
      }
    }
  }

  if (!articleId) return null;
  return knowledgeService.articleDetail(articleId);
}

async function uploadMultipart<T>(path: string, form: FormData): Promise<T> {
  const accessToken = tokenStore.getAccessToken();
  const activeBusinessId = businessStore.get();
  const response = await fetch(`${env.apiUrl}${path}`, {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(activeBusinessId ? { "X-Business-Id": activeBusinessId } : {}),
    },
    body: form,
  });
  const body = await response.json().catch(() => null) as { error?: { code?: string; message?: string; details?: Record<string, string[]> } } | T | null;
  if (!response.ok) {
    const error = body && typeof body === "object" && "error" in body ? body.error : undefined;
    throw new ApiError(error?.code ?? "UPLOAD_FAILED", error?.message ?? "Upload failed. Please try again.", response.status, error?.details);
  }
  return body as T;
}

function documentForm(input: KnowledgeDocumentInput & { file: File }) {
  const form = new FormData();
  form.set("file", input.file);
  form.set("title", input.title);
  if (input.description) form.set("description", input.description);
  if (input.category) form.set("category", input.category);
  form.set("visibility", input.visibility ?? "INTERNAL_ONLY");
  for (const tag of input.tags ?? []) form.append("tags[]", tag);
  for (const serviceId of input.relatedServiceIds ?? []) form.append("relatedServiceIds[]", serviceId);
  return form;
}

export const knowledgeService = {
  articles: (query: KnowledgeListQuery = {}) => env.useMockApi
    ? mockKnowledgeService.articles(query)
    : apiRequest<KnowledgeListResponse<KnowledgeArticle>>(`/business/knowledge/articles?${queryString(query)}`),
  documents: (query: KnowledgeListQuery = {}) => env.useMockApi
    ? mockKnowledgeService.documents(query)
    : apiRequest<KnowledgeListResponse<KnowledgeDocument>>(`/business/knowledge/documents?${queryString(query)}`),
  search: ({ query, conversationId }: { query: string; conversationId?: string }) => env.useMockApi
    ? mockKnowledgeService.search(query)
    : query.trim()
      ? apiRequest<unknown>(`/business/knowledge/search?${queryString({ query: query.trim(), conversationId })}`).then(normalizeSearchResponse)
      : defaultKnowledgeAssets(),
  createArticle: (input: KnowledgeArticleInput) => env.useMockApi
    ? mockKnowledgeService.createArticle(input)
    : apiRequest<unknown>("/business/knowledge/articles", { method: "POST", body: JSON.stringify(input) }).then(unwrapArticle),
  articleDetail: (id: string) => apiRequest<unknown>(`/business/knowledge/articles/${id}`).then(unwrapArticle),
  updateArticle: ({ id, input }: { id: string; input: UpdateKnowledgeArticleInput }) => env.useMockApi
    ? mockKnowledgeService.updateArticle(id, input)
    : apiRequest<unknown>(`/business/knowledge/articles/${id}`, { method: "PATCH", body: JSON.stringify(input) }).then(unwrapArticle),
  updateArticleStatus: ({ id, status }: { id: string; status: KnowledgeArticleStatus }) => env.useMockApi
    ? mockKnowledgeService.updateArticleStatus(id, status)
    : apiRequest<unknown>(`/business/knowledge/articles/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }).then(unwrapArticle),
  generateStarter: (input: GenerateStarterArticlesInput) => env.useMockApi
    ? mockKnowledgeService.generateStarter(input)
    : apiRequest<{ data: KnowledgeArticle[] }>("/business/knowledge/articles/generate-starter", { method: "POST", body: JSON.stringify(input) }),
  draftArticle: (input: DraftKnowledgeArticleInput) => env.useMockApi
    ? mockKnowledgeService.draftArticle(input)
    : apiRequest<unknown>("/business/knowledge/articles/draft", { method: "POST", body: JSON.stringify(input) }).then(unwrapArticle),
  streamDraftArticle,
  uploadDocument: (input: KnowledgeDocumentInput & { file: File }) => env.useMockApi
    ? mockKnowledgeService.uploadDocument(input)
    : uploadMultipart<KnowledgeDocument>("/business/knowledge/documents/upload", documentForm(input)),
  updateDocumentStatus: ({ id, status }: { id: string; status: KnowledgeDocumentStatus }) => env.useMockApi
    ? mockKnowledgeService.updateDocumentStatus(id, status)
    : apiRequest<KnowledgeDocument>(`/business/knowledge/documents/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  send: ({ conversationId, input }: { conversationId: string; input: KnowledgeSendInput }) => env.useMockApi
    ? mockKnowledgeService.send(conversationId, input)
    : apiRequest<KnowledgeSendResponse>(`/business/conversations/${conversationId}/knowledge/send`, { method: "POST", body: JSON.stringify(knowledgeSendBody(input)) }),
};
