import type { DayOfWeek } from "@/types/business-availability";
import type { BusinessPolicyCategory } from "@/types/business-policy";
import type { ServicePriceType, ServiceReadinessStatus } from "@/types/business-service";

export type KnowledgeReadinessLevel = "NOT_READY" | "PARTIAL" | "AI_READY" | "BOOKING_READY";
export type KnowledgeSectionState = "MISSING" | "INCOMPLETE" | "PARTIAL" | "READY";
export type KnowledgeSeverity = "HIGH" | "MEDIUM" | "LOW";
export type KnowledgeConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface KnowledgeSectionStatus {
  score: number;
  status: KnowledgeSectionState;
  label: string;
  description: string;
  route: string;
}

export interface KnowledgeTopic {
  key: string;
  label: string;
  reason: string;
  confidence?: KnowledgeConfidence;
  severity?: KnowledgeSeverity;
}

export interface KnowledgeGap {
  key: string;
  label: string;
  description: string;
  section: "PROFILE" | "SERVICES" | "AVAILABILITY" | "POLICIES" | "WHATSAPP";
  severity: KnowledgeSeverity;
  route: string;
}

export interface KnowledgeAction {
  key: string;
  label: string;
  description: string;
  route: string;
  priority: number;
}

export interface KnowledgeServiceItem {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  priceType: ServicePriceType;
  priceDescription: string | null;
  priceDisplay: string;
  durationMinutes: number | null;
  isBookable: boolean;
  requiresPayment: boolean;
  paymentRequiredBeforeBooking: boolean;
  readinessStatus: ServiceReadinessStatus;
  missingFields: string[];
}

export interface KnowledgePolicyItem {
  id: string;
  title: string;
  category: BusinessPolicyCategory;
  shortSummary: string | null;
  priority: number;
  visibility?: "CUSTOMER_FACING";
}

export interface BusinessKnowledgePreview {
  businessId: string;
  generatedAt: string;
  readiness: {
    overallScore: number;
    level: KnowledgeReadinessLevel;
    isAiReady: boolean;
    isBookingReady: boolean;
  };
  sections: {
    profile: KnowledgeSectionStatus;
    services: KnowledgeSectionStatus;
    availability: KnowledgeSectionStatus;
    policies: KnowledgeSectionStatus;
    whatsapp: KnowledgeSectionStatus;
  };
  businessSummary: {
    name: string;
    industry: string | null;
    description: string | null;
    country: string | null;
    city: string | null;
    serviceArea: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    timezone: string;
    defaultCurrency: string;
  };
  servicesPreview: {
    total: number;
    active: number;
    readyForAi: number;
    readyForBooking: number;
    missingPrices: string[];
    missingDurations: string[];
    items: KnowledgeServiceItem[];
  };
  availabilityPreview: {
    timezone: string;
    hasCompleteWeeklySchedule: boolean;
    openDays: number;
    closedDays: number;
    readableHours: string[];
    gaps: { missingDays: DayOfWeek[]; invalidRules: DayOfWeek[] };
  };
  policiesPreview: {
    total: number;
    active: number;
    customerFacing: number;
    internalOnly: number;
    configuredCategories: BusinessPolicyCategory[];
    missingRecommendedCategories: BusinessPolicyCategory[];
    items: KnowledgePolicyItem[];
  };
  whatsappPreview: {
    status: string;
    connected: boolean;
    canSendMessages: boolean;
  };
  safeToAnswerTopics: KnowledgeTopic[];
  needsHumanConfirmationTopics: KnowledgeTopic[];
  gaps: KnowledgeGap[];
  recommendedNextActions: KnowledgeAction[];
  aiInstructionsPreview: {
    canAnswer: string[];
    shouldAvoid: string[];
    shouldHandoff: string[];
  };
}
