export type KnowledgeArticleStatus = "DRAFT" | "NEEDS_REVIEW" | "PUBLISHED" | "ARCHIVED";
export type KnowledgeArticleSource = "AI_DRAFT" | "MANUAL" | "IMPORTED";
export type KnowledgeVisibility = "INTERNAL_ONLY" | "CLIENT_SENDABLE";
export type KnowledgeDocumentStatus = "ACTIVE" | "ARCHIVED" | "DELETED";
export type KnowledgeDocumentProcessingStatus = "UPLOADING" | "QUEUED" | "PROCESSING" | "READY" | "NEEDS_REVIEW" | "FAILED";
export type KnowledgeDocumentAction = "VIEW" | "DOWNLOAD" | "ARCHIVE" | "RESTORE" | "DELETE" | "RETRY_PROCESSING" | "VIEW_VERSIONS";
export type KnowledgeAssetType = "ARTICLE" | "DOCUMENT";

export interface KnowledgeUserSummary {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface KnowledgeMembershipSummary {
  id: string;
  role?: string | null;
  user?: KnowledgeUserSummary | null;
}

export interface KnowledgeDocumentVersion {
  id: string;
  businessId?: string;
  documentId?: string;
  versionNumber: number;
  originalFileName: string;
  safeFileName?: string | null;
  fileExtension?: string | null;
  fileSize: number;
  mimeType: string;
  checksum?: string | null;
  processingStatus: KnowledgeDocumentProcessingStatus;
  isActive?: boolean;
  uploadedByUserId?: string | null;
  uploadedByMembershipId?: string | null;
  createdAt: string;
}

export interface KnowledgeArticle {
  id: string;
  businessId: string;
  title: string;
  slug?: string | null;
  summary?: string | null;
  body: string;
  category?: string | null;
  tags: string[];
  relatedServiceIds: string[];
  status: KnowledgeArticleStatus;
  source: KnowledgeArticleSource;
  visibility: KnowledgeVisibility;
  aiGenerated: boolean;
  aiDraftReason?: string | null;
  aiConfidence?: number | null;
  reviewedByMembershipId?: string | null;
  reviewedAt?: string | null;
  publishedByMembershipId?: string | null;
  publishedAt?: string | null;
  pdfFileId?: string | null;
  lastPdfGeneratedAt?: string | null;
  createdByMembershipId?: string | null;
  updatedByMembershipId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  businessId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  tags: string[];
  relatedServiceIds: string[];
  fileUrl: string;
  fileName: string;
  originalFileName?: string | null;
  safeFileName?: string | null;
  fileExtension?: string | null;
  mimeType: string;
  fileSize: number;
  status: KnowledgeDocumentStatus;
  processingStatus: KnowledgeDocumentProcessingStatus;
  processingErrorCode?: string | null;
  processingErrorMessage?: string | null;
  processingError?: { code?: string | null; message?: string | null } | null;
  visibility: KnowledgeVisibility;
  uploadedByMembershipId: string;
  uploadedByUserId?: string | null;
  uploadedBy?: KnowledgeMembershipSummary | null;
  activeVersionId?: string | null;
  activeVersion?: KnowledgeDocumentVersion | null;
  versions?: KnowledgeDocumentVersion[];
  _count?: { versions?: number };
  availableActions?: KnowledgeDocumentAction[];
  archivedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSearchResult {
  assetType: KnowledgeAssetType;
  id: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  category?: string | null;
  tags: string[];
  status: string;
  visibility: KnowledgeVisibility;
  canSendToClient: boolean;
  fileName?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  source?: KnowledgeArticleSource | null;
}

export interface KnowledgeListQuery {
  search?: string;
  status?: string;
  processingStatus?: string;
  category?: string;
  visibility?: KnowledgeVisibility;
  source?: KnowledgeArticleSource;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface KnowledgeArticleInput {
  title: string;
  summary?: string | null;
  body: string;
  category?: string | null;
  tags?: string[];
  relatedServiceIds?: string[];
  visibility?: KnowledgeVisibility;
  status?: KnowledgeArticleStatus;
}

export type UpdateKnowledgeArticleInput = Partial<KnowledgeArticleInput>;

export interface DraftKnowledgeArticleInput {
  topic: string;
  category?: string;
  relatedServiceIds?: string[];
  relatedPolicyIds?: string[];
  visibility?: KnowledgeVisibility;
  customerQuestion?: string;
}

export type KnowledgeDraftStreamMetadata = {
  title?: string;
  summary?: string;
  category?: string | null;
  tags?: string[];
  visibility?: KnowledgeVisibility;
  status?: KnowledgeArticleStatus;
  source?: KnowledgeArticleSource;
  aiGenerated?: boolean;
  aiConfidence?: number | null;
  aiDraftReason?: string | null;
};

export type KnowledgeDraftStreamSaved = {
  articleId?: string;
  status?: KnowledgeArticleStatus;
  source?: KnowledgeArticleSource;
  aiGenerated?: boolean;
};

export type KnowledgeDraftStreamCompleted = {
  success?: boolean;
  articleId?: string;
};

export type KnowledgeDraftStreamError = {
  success?: false;
  reason?: string;
  message?: string;
};

export type KnowledgeDraftStreamHandlers = {
  onStarted?: (data: { status?: string; message?: string }) => void;
  onDelta?: (delta: string) => void;
  onMetadata?: (metadata: KnowledgeDraftStreamMetadata) => void;
  onSaved?: (saved: KnowledgeDraftStreamSaved) => void;
  onCompleted?: (completed: KnowledgeDraftStreamCompleted) => void;
  onError?: (error: KnowledgeDraftStreamError) => void;
};

export interface GenerateStarterArticlesInput {
  count?: number;
  categories?: string[];
}

export interface KnowledgeDocumentInput {
  title: string;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  relatedServiceIds?: string[];
  visibility?: KnowledgeVisibility;
}

export interface KnowledgeStats {
  assetUsage?: { used: number; limit: number };
  pdfUsage?: { used: number; limit: number };
  storageUsage?: {
    usedBytes: number;
    limitBytes: number;
    documentVersionBytes?: number;
    articlePdfBytes?: number;
  };
  aiDraftUsage?: { usedThisMonth: number; monthlyLimit: number };
  businessStorageBreakdown?: Array<{
    businessId: string;
    businessName: string;
    usedBytes: number;
    documentVersionBytes?: number;
    articlePdfBytes?: number;
    activeAssets: number;
    activePdfCount: number;
  }>;
}

export interface KnowledgeDocumentUploadResponse {
  document: KnowledgeDocument;
  duplicate?: boolean;
  duplicateWarning?: { code?: string; existingDocumentId?: string | null } | null;
  idempotentReplay?: boolean;
}

export interface KnowledgeDocumentDownloadUrl {
  url: string;
  expiresAt?: string | null;
  authenticated?: boolean;
}

export interface KnowledgeSendInput {
  assetType: KnowledgeAssetType;
  assetId: string;
  messageText: string;
}

export interface KnowledgeSendResponse {
  success: boolean;
  status: "SENT" | "QUEUED" | "FAILED";
  messageId?: string;
  sendLogId?: string;
  assetType: KnowledgeAssetType;
  assetId: string;
  reason?: string;
}

export interface KnowledgeListResponse<T> {
  items: T[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}
