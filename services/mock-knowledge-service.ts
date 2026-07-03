import type {
  DraftKnowledgeArticleInput,
  GenerateStarterArticlesInput,
  KnowledgeArticle,
  KnowledgeArticleInput,
  KnowledgeDocument,
  KnowledgeDocumentInput,
  KnowledgeListQuery,
  KnowledgeListResponse,
  KnowledgeSearchResult,
  KnowledgeSendInput,
  KnowledgeSendResponse,
  UpdateKnowledgeArticleInput,
} from "@/types/knowledge";

const now = new Date().toISOString();

let articles: KnowledgeArticle[] = [
  {
    id: "kb_article_payment_policy",
    businessId: "biz_demo",
    title: "Payment and deposit policy",
    summary: "A clear guide explaining deposit expectations, payment timing, and what happens after payment.",
    body: "Customers are expected to confirm their appointment details before payment. Deposits may be requested for high-value or limited-slot services.",
    category: "Payments",
    tags: ["Payment", "Deposit", "Policy"],
    relatedServiceIds: [],
    status: "PUBLISHED",
    source: "MANUAL",
    visibility: "CLIENT_SENDABLE",
    aiGenerated: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "kb_article_viewing_draft",
    businessId: "biz_demo",
    title: "Property viewing preparation guide",
    summary: "AI drafted a viewing checklist for customers before attending a property tour.",
    body: "Before your viewing, please bring identification, confirm your preferred budget range, and prepare any questions about location, pricing, and availability.",
    category: "Services",
    tags: ["Viewing", "Checklist"],
    relatedServiceIds: ["service_demo_viewing"],
    status: "NEEDS_REVIEW",
    source: "AI_DRAFT",
    visibility: "CLIENT_SENDABLE",
    aiGenerated: true,
    aiDraftReason: "Generated from active services and appointment policies.",
    aiConfidence: 0.86,
    createdAt: now,
    updatedAt: now,
  },
];

let documents: KnowledgeDocument[] = [
  {
    id: "kb_doc_company_profile",
    businessId: "biz_demo",
    title: "Company profile",
    description: "A short PDF customers can review before choosing a service package.",
    category: "Company",
    tags: ["Profile", "PDF"],
    relatedServiceIds: [],
    fileUrl: "https://example.com/company-profile.pdf",
    fileName: "company-profile.pdf",
    mimeType: "application/pdf",
    fileSize: 842_100,
    status: "ACTIVE",
    visibility: "CLIENT_SENDABLE",
    uploadedByMembershipId: "member_demo",
    createdAt: now,
    updatedAt: now,
  },
];

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

function listFilter<T extends { title: string; category?: string | null; status: string; visibility: string; tags: string[] }>(items: T[], query: KnowledgeListQuery) {
  return items.filter((item) => {
    const haystack = `${item.title} ${item.category ?? ""} ${item.tags.join(" ")}`.toLowerCase();
    if (query.search && !haystack.includes(query.search.toLowerCase())) return false;
    if (query.status && item.status !== query.status) return false;
    if (query.category && item.category !== query.category) return false;
    if (query.visibility && item.visibility !== query.visibility) return false;
    return true;
  });
}

function paged<T>(items: T[], query: KnowledgeListQuery): KnowledgeListResponse<T> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), pagination: { page, limit, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / limit)) } };
}

function toSearchResult(asset: KnowledgeArticle | KnowledgeDocument): KnowledgeSearchResult {
  if ("body" in asset) {
    return {
      assetType: "ARTICLE",
      id: asset.id,
      title: asset.title,
      summary: asset.summary,
      category: asset.category,
      tags: asset.tags,
      status: asset.status,
      visibility: asset.visibility,
      source: asset.source,
      canSendToClient: asset.status === "PUBLISHED" && asset.visibility === "CLIENT_SENDABLE",
    };
  }
  return {
    assetType: "DOCUMENT",
    id: asset.id,
    title: asset.title,
    description: asset.description,
    category: asset.category,
    tags: asset.tags,
    status: asset.status,
    visibility: asset.visibility,
    canSendToClient: asset.status === "ACTIVE" && asset.visibility === "CLIENT_SENDABLE",
    fileName: asset.fileName,
    fileUrl: asset.fileUrl,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
  };
}

export const mockKnowledgeService = {
  async articles(query: KnowledgeListQuery): Promise<KnowledgeListResponse<KnowledgeArticle>> {
    await delay();
    const filtered = listFilter(articles, query).filter((article) => !query.source || article.source === query.source);
    return paged(filtered, query);
  },
  async documents(query: KnowledgeListQuery): Promise<KnowledgeListResponse<KnowledgeDocument>> {
    await delay();
    return paged(listFilter(documents, query), query);
  },
  async search(query: string): Promise<KnowledgeSearchResult[]> {
    await delay(220);
    const haystack = query.toLowerCase();
    return [...articles, ...documents]
      .map(toSearchResult)
      .filter((item) => !query || `${item.title} ${item.summary ?? ""} ${item.description ?? ""} ${item.tags.join(" ")}`.toLowerCase().includes(haystack));
  },
  async createArticle(input: KnowledgeArticleInput): Promise<KnowledgeArticle> {
    await delay();
    const article: KnowledgeArticle = {
      id: `kb_article_${Date.now()}`,
      businessId: "biz_demo",
      title: input.title,
      summary: input.summary ?? null,
      body: input.body,
      category: input.category ?? null,
      tags: input.tags ?? [],
      relatedServiceIds: input.relatedServiceIds ?? [],
      status: input.status ?? "DRAFT",
      source: "MANUAL",
      visibility: input.visibility ?? "INTERNAL_ONLY",
      aiGenerated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    articles = [article, ...articles];
    return article;
  },
  async updateArticle(id: string, input: UpdateKnowledgeArticleInput): Promise<KnowledgeArticle> {
    await delay();
    const existing = articles.find((article) => article.id === id);
    if (!existing) throw new Error("Article not found.");
    const next = { ...existing, ...input, updatedAt: new Date().toISOString() };
    articles = articles.map((article) => article.id === id ? next : article);
    return next;
  },
  async updateArticleStatus(id: string, status: KnowledgeArticle["status"]): Promise<KnowledgeArticle> {
    return this.updateArticle(id, {
      status,
      ...(status === "PUBLISHED" ? { publishedAt: new Date().toISOString() } : {}),
      ...(status === "NEEDS_REVIEW" ? { reviewedAt: new Date().toISOString() } : {}),
    });
  },
  async generateStarter(input: GenerateStarterArticlesInput): Promise<{ data: KnowledgeArticle[] }> {
    await delay();
    const topics = (input.categories?.length ? input.categories : ["Services and pricing", "Booking appointments", "Business hours", "Payment and cancellation"]).slice(0, input.count ?? 4);
    const created = topics.map((topic): KnowledgeArticle => ({
        id: `kb_article_starter_${Date.now()}`,
        businessId: "biz_demo",
        title: `${topic} guide`,
        summary: `Starter article explaining ${topic.toLowerCase()} for customers.`,
        body: `Customers can use this guide to understand ${topic.toLowerCase()} before contacting the business.`,
        category: topic,
        tags: [topic, "Guide"],
        relatedServiceIds: [],
        status: "NEEDS_REVIEW",
        source: "AI_DRAFT",
        visibility: "CLIENT_SENDABLE",
        aiGenerated: true,
        aiDraftReason: "Generated from business profile, availability, and appointment rules.",
        aiConfidence: 0.81,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    articles = [...created, ...articles];
    return { data: created };
  },
  async draftArticle(input: DraftKnowledgeArticleInput): Promise<KnowledgeArticle> {
    await delay();
    const article: KnowledgeArticle = {
      id: `kb_article_draft_${Date.now()}`,
      businessId: "biz_demo",
      title: input.topic,
      summary: `AI draft for ${input.topic}.`,
      body: `This article was drafted for ${input.topic}. Review the details before publishing.`,
      category: input.category ?? null,
      tags: [],
      relatedServiceIds: input.relatedServiceIds ?? [],
      status: "NEEDS_REVIEW",
      source: "AI_DRAFT",
      visibility: input.visibility ?? "CLIENT_SENDABLE",
      aiGenerated: true,
      aiDraftReason: "Drafted from business knowledge.",
      aiConfidence: 0.78,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    articles = [article, ...articles];
    return article;
  },
  async uploadDocument(input: KnowledgeDocumentInput & { file?: File }): Promise<KnowledgeDocument> {
    await delay();
    const document: KnowledgeDocument = {
      id: `kb_doc_${Date.now()}`,
      businessId: "biz_demo",
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      tags: input.tags ?? [],
      relatedServiceIds: input.relatedServiceIds ?? [],
      fileUrl: "#",
      fileName: input.file?.name ?? "uploaded-document.pdf",
      mimeType: input.file?.type ?? "application/pdf",
      fileSize: input.file?.size ?? 0,
      status: "ACTIVE",
      visibility: input.visibility ?? "CLIENT_SENDABLE",
      uploadedByMembershipId: "member_demo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    documents = [document, ...documents];
    return document;
  },
  async updateDocumentStatus(id: string, status: KnowledgeDocument["status"]): Promise<KnowledgeDocument> {
    await delay();
    const existing = documents.find((document) => document.id === id);
    if (!existing) throw new Error("Document not found.");
    const next = { ...existing, status, updatedAt: new Date().toISOString() };
    documents = documents.map((document) => document.id === id ? next : document);
    return next;
  },
  async send(_conversationId: string, input: KnowledgeSendInput): Promise<KnowledgeSendResponse> {
    await delay();
    return { success: true, status: "SENT", messageId: `msg_${Date.now()}`, sendLogId: `send_${Date.now()}`, assetType: input.assetType, assetId: input.assetId };
  },
};
