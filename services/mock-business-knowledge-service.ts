import type { BusinessKnowledgePreview } from "@/types/business-knowledge";

const preview: BusinessKnowledgePreview = {
  businessId: "biz_demo",
  generatedAt: new Date().toISOString(),
  readiness: { overallScore: 72, level: "PARTIAL", isAiReady: false, isBookingReady: false },
  sections: {
    profile: { score: 95, status: "READY", label: "Business profile", description: "Business identity and contact readiness.", route: "/settings/business/profile" },
    services: { score: 75, status: "PARTIAL", label: "Services & Pricing", description: "Active service and pricing readiness.", route: "/settings/business/services" },
    availability: { score: 100, status: "READY", label: "Availability", description: "Weekly schedule readiness.", route: "/settings/business/availability" },
    policies: { score: 55, status: "INCOMPLETE", label: "Policies", description: "Customer-facing policy readiness.", route: "/settings/business/policies" },
    whatsapp: { score: 40, status: "INCOMPLETE", label: "WhatsApp connection", description: "Messaging connection readiness.", route: "/settings/business/whatsapp" },
  },
  businessSummary: {
    name: "Foundation Group",
    industry: "CONSTRUCTION",
    description: "Property development, construction, and site inspection services.",
    country: "Ghana",
    city: "Accra",
    serviceArea: "Greater Accra",
    phone: "+233 24 000 0000",
    email: "hello@foundation.example",
    website: null,
    timezone: "Africa/Accra",
    defaultCurrency: "GHS",
  },
  servicesPreview: {
    total: 2, active: 2, readyForAi: 1, readyForBooking: 1,
    missingPrices: ["Site Inspection"], missingDurations: ["Site Inspection"],
    items: [
      { id: "service_demo_viewing", name: "Property Viewing", category: "Real Estate", description: "A guided property viewing with one of our agents.", priceType: "FIXED", priceDescription: null, priceDisplay: "GHS 100.00", durationMinutes: 45, isBookable: true, requiresPayment: false, paymentRequiredBeforeBooking: false, readinessStatus: "READY_FOR_BOOKING", missingFields: [] },
      { id: "service_demo_inspection", name: "Site Inspection", category: "Construction", description: null, priceType: "NOT_SET", priceDescription: null, priceDisplay: "Price not set", durationMinutes: null, isBookable: false, requiresPayment: false, paymentRequiredBeforeBooking: false, readinessStatus: "DRAFT", missingFields: ["description", "price", "durationMinutes"] },
    ],
  },
  availabilityPreview: {
    timezone: "Africa/Accra", hasCompleteWeeklySchedule: true, openDays: 6, closedDays: 1,
    readableHours: ["MONDAY: 08:00-17:00", "TUESDAY: 08:00-17:00", "WEDNESDAY: 08:00-17:00", "THURSDAY: 08:00-17:00", "FRIDAY: 08:00-17:00", "SATURDAY: 09:00-15:00", "SUNDAY: Closed"],
    gaps: { missingDays: [], invalidRules: [] },
  },
  policiesPreview: {
    total: 2, active: 2, customerFacing: 1, internalOnly: 1, configuredCategories: ["PAYMENT"],
    missingRecommendedCategories: ["CANCELLATION", "REFUND", "RESCHEDULING", "DEPOSIT", "SERVICE_AREA"],
    items: [{ id: "policy_demo_payment", title: "Payment terms", category: "PAYMENT", shortSummary: "Payment is required before a confirmed appointment.", priority: 10, visibility: "CUSTOMER_FACING" }],
  },
  whatsappPreview: { status: "CONNECTING", connected: false, canSendMessages: false },
  safeToAnswerTopics: [
    { key: "business-identity", label: "Business identity", reason: "Business name, industry, and description are configured.", confidence: "HIGH" },
    { key: "services-offered", label: "Services offered", reason: "At least one active service exists.", confidence: "HIGH" },
    { key: "opening-hours", label: "Opening hours", reason: "A complete weekly availability schedule is configured.", confidence: "HIGH" },
  ],
  needsHumanConfirmationTopics: [
    { key: "add-refund-policy", label: "Add refund policy", reason: "No approved refund policy is configured.", severity: "HIGH" },
    { key: "restore-whatsapp-sending", label: "Restore WhatsApp sending", reason: "WhatsApp cannot currently send messages.", severity: "HIGH" },
  ],
  gaps: [
    { key: "add-refund-policy", label: "Add refund policy", description: "No approved refund policy is configured.", section: "POLICIES", severity: "HIGH", route: "/settings/business/policies" },
    { key: "restore-whatsapp-sending", label: "Restore WhatsApp sending", description: "WhatsApp cannot currently send messages.", section: "WHATSAPP", severity: "HIGH", route: "/settings/business/whatsapp" },
  ],
  recommendedNextActions: [
    { key: "restore-whatsapp-sending", label: "Restore WhatsApp sending", description: "WhatsApp cannot currently send messages.", route: "/settings/business/whatsapp", priority: 1 },
    { key: "add-refund-policy", label: "Add refund policy", description: "No approved refund policy is configured.", route: "/settings/business/policies", priority: 2 },
  ],
  aiInstructionsPreview: {
    canAnswer: ["Business identity", "Services offered", "Opening hours"],
    shouldAvoid: ["Add refund policy", "Restore WhatsApp sending"],
    shouldHandoff: ["Payment disputes", "Price negotiation", "Appointment exceptions", "Complaints", "Add refund policy", "Restore WhatsApp sending"],
  },
};

export const mockBusinessKnowledgeService = {
  async get(): Promise<BusinessKnowledgePreview> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { ...preview, generatedAt: new Date().toISOString() };
  },
};
