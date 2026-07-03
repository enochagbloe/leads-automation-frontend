import type { ApiMessage } from "@/types/auth";
import type { BusinessService, BusinessServiceInput, BusinessServicesQuery, BusinessServicesResponse, ServicesSummary, UpdateBusinessServiceInput } from "@/types/business-service";

const now = new Date().toISOString();
let services: BusinessService[] = [
  {
    id: "service_demo_viewing", name: "Property Viewing", slug: "property-viewing", category: "Real Estate",
    description: "A guided property viewing with one of our agents.", basePrice: "100.00", currency: "GHS",
    priceType: "FIXED", priceDescription: null, durationMinutes: 45, bufferMinutes: 15, requiresPayment: false,
    paymentRequiredBeforeBooking: false, isBookable: true, isActive: true, isArchived: false,
    autoConfirmEligible: true, requiresManualApproval: false, requiresDepositBeforeConfirmation: false,
    requiresLocationBeforeConfirmation: false, requiresStaffAssignment: true,
    readinessStatus: "READY_FOR_BOOKING", missingFields: [], displayOrder: 1, source: "MANUAL",
    createdAt: now, updatedAt: now, archivedAt: null,
  },
  {
    id: "service_demo_inspection", name: "Site Inspection", slug: "site-inspection", category: "Construction",
    description: null, basePrice: null, currency: "GHS", priceType: "NOT_SET", priceDescription: null,
    durationMinutes: null, bufferMinutes: 0, requiresPayment: false, paymentRequiredBeforeBooking: false,
    isBookable: false, isActive: true, isArchived: false, readinessStatus: "DRAFT",
    autoConfirmEligible: false, requiresManualApproval: true, requiresDepositBeforeConfirmation: false,
    requiresLocationBeforeConfirmation: true, requiresStaffAssignment: true,
    missingFields: ["description", "price", "durationMinutes"], displayOrder: 2, source: "MANUAL",
    createdAt: now, updatedAt: now, archivedAt: null,
  },
];

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const readiness = (input: BusinessServiceInput, archived = false) => {
  if (archived) return { readinessStatus: "ARCHIVED" as const, missingFields: [] };
  const missingFields = [
    ...(!input.description ? ["description"] : []),
    ...(!["FREE"].includes(input.priceType ?? "") && !input.basePrice && !input.priceDescription ? ["price"] : []),
    ...(!input.durationMinutes ? ["durationMinutes"] : []),
  ];
  const meaningful = Boolean(input.category || input.description || input.basePrice || input.priceType !== "NOT_SET" || input.durationMinutes || input.isBookable);
  if (!meaningful) return { readinessStatus: "DRAFT" as const, missingFields };
  const readyForAi = Boolean(input.description && (input.priceType === "FREE" || input.basePrice || input.priceDescription));
  if (readyForAi && input.durationMinutes && input.isBookable) return { readinessStatus: "READY_FOR_BOOKING" as const, missingFields };
  if (readyForAi) return { readinessStatus: "READY_FOR_AI" as const, missingFields };
  return { readinessStatus: "INCOMPLETE" as const, missingFields };
};
const summary = (): ServicesSummary => {
  const current = services.filter((service) => !service.isArchived);
  return {
    total: current.length, active: current.filter((service) => service.isActive).length, inactive: current.filter((service) => !service.isActive).length,
    archived: services.filter((service) => service.isArchived).length, draft: current.filter((service) => service.readinessStatus === "DRAFT").length,
    incomplete: current.filter((service) => service.readinessStatus === "INCOMPLETE").length,
    readyForAi: current.filter((service) => ["READY_FOR_AI", "READY_FOR_BOOKING"].includes(service.readinessStatus)).length,
    readyForBooking: current.filter((service) => service.readinessStatus === "READY_FOR_BOOKING").length,
    missingPrices: current.filter((service) => service.missingFields.includes("price")).length,
    missingDurations: current.filter((service) => service.missingFields.includes("durationMinutes")).length,
    bookable: current.filter((service) => service.isBookable).length,
  };
};
const makeService = (input: BusinessServiceInput, existing?: BusinessService): BusinessService => {
  const merged = { ...existing, ...input };
  return {
    id: existing?.id ?? `service_demo_${Date.now()}`, name: input.name, slug: existing?.slug ?? input.name.toLowerCase().replaceAll(/\s+/g, "-"),
    category: input.category ?? null, description: input.description ?? null, basePrice: input.basePrice ?? null, currency: input.currency ?? "GHS",
    priceType: input.priceType ?? "NOT_SET", priceDescription: input.priceDescription ?? null, durationMinutes: input.durationMinutes ?? null,
    bufferMinutes: input.bufferMinutes ?? 0, requiresPayment: input.requiresPayment ?? false, paymentRequiredBeforeBooking: input.paymentRequiredBeforeBooking ?? false,
    isBookable: input.isBookable ?? false, isActive: input.isActive ?? true, isArchived: existing?.isArchived ?? false,
    autoConfirmEligible: input.autoConfirmEligible ?? existing?.autoConfirmEligible ?? false,
    requiresManualApproval: input.requiresManualApproval ?? existing?.requiresManualApproval ?? false,
    requiresDepositBeforeConfirmation: input.requiresDepositBeforeConfirmation ?? existing?.requiresDepositBeforeConfirmation ?? false,
    requiresLocationBeforeConfirmation: input.requiresLocationBeforeConfirmation ?? existing?.requiresLocationBeforeConfirmation ?? false,
    requiresStaffAssignment: input.requiresStaffAssignment ?? existing?.requiresStaffAssignment ?? false,
    ...readiness(merged, existing?.isArchived), displayOrder: existing?.displayOrder ?? services.length + 1, source: existing?.source ?? "MANUAL",
    createdAt: existing?.createdAt ?? now, updatedAt: new Date().toISOString(), archivedAt: existing?.archivedAt ?? null,
  };
};

export const mockBusinessServiceService = {
  async list(query: BusinessServicesQuery): Promise<BusinessServicesResponse> {
    await delay();
    const filtered = services.filter((service) => {
      if (query.status === "active" && (!service.isActive || service.isArchived)) return false;
      if (query.status === "inactive" && (service.isActive || service.isArchived)) return false;
      if (query.status === "archived" && !service.isArchived) return false;
      if (query.readinessStatus && service.readinessStatus !== query.readinessStatus) return false;
      return !query.search || [service.name, service.category, service.description].some((value) => value?.toLowerCase().includes(query.search!.toLowerCase()));
    });
    const start = (query.page - 1) * query.limit;
    return { items: filtered.slice(start, start + query.limit), pagination: { page: query.page, limit: query.limit, total: filtered.length, totalPages: Math.ceil(filtered.length / query.limit) }, summary: summary() };
  },
  async summary() { await delay(200); return summary(); },
  async detail(id: string) { await delay(); return services.find((service) => service.id === id)!; },
  async create(input: BusinessServiceInput) { await delay(); const service = makeService(input); services = [...services, service]; return service; },
  async update({ id, input }: { id: string; input: UpdateBusinessServiceInput }) { await delay(); const existing = services.find((service) => service.id === id)!; const service = makeService({ ...existing, ...input, name: input.name ?? existing.name }, existing); services = services.map((item) => item.id === id ? service : item); return service; },
  async archive(id: string) { await delay(); const existing = services.find((service) => service.id === id)!; const service = { ...existing, isActive: false, isArchived: true, readinessStatus: "ARCHIVED" as const, missingFields: [], archivedAt: new Date().toISOString() }; services = services.map((item) => item.id === id ? service : item); return service; },
  async restore(id: string) { await delay(); const existing = services.find((service) => service.id === id)!; const service = makeService({ ...existing, name: existing.name, isActive: true }, { ...existing, isArchived: false, archivedAt: null }); services = services.map((item) => item.id === id ? service : item); return service; },
  async reorder(items: Array<{ id: string; displayOrder: number }>): Promise<ApiMessage> { await delay(); services = services.map((service) => ({ ...service, displayOrder: items.find((item) => item.id === service.id)?.displayOrder ?? service.displayOrder })); return { message: "Services reordered successfully" }; },
};
