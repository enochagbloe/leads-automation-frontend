import type { BusinessSetupStatus } from "@/types/business-setup";
import { getMockPoliciesSummary } from "@/services/mock-business-policy-service";

const mockBusinessSetupStatus: BusinessSetupStatus = {
  businessId: "biz_demo",
  plan: "BASIC",
  completionPercentage: 45,
  readinessStatus: "INCOMPLETE",
  isManualInboxReady: false,
  isAiReady: false,
  missingItems: [
    {
      key: "location",
      label: "Add business country and city",
      description: "Add the country and city where the business operates.",
      route: "/settings/business/profile",
      requiredFor: "MANUAL_INBOX",
      planRequired: "BASIC",
    },
    {
      key: "whatsappConnection",
      label: "Connect WhatsApp",
      description: "Connect WhatsApp so your business can receive and reply to customer messages.",
      route: "/settings/integrations/whatsapp",
      requiredFor: "MANUAL_INBOX",
      planRequired: "BASIC",
    },
    {
      key: "services",
      label: "Add at least one service",
      description: "Services help BizReply understand what your business offers.",
      route: "/settings/business/services",
      requiredFor: "AI_AUTOMATION",
      planRequired: "BASIC",
    },
    {
      key: "servicePricing",
      label: "Add service pricing",
      description: "Add a price or pricing note to at least one active service.",
      route: "/settings/business/services",
      requiredFor: "AI_AUTOMATION",
      planRequired: "BASIC",
    },
    {
      key: "business-availability",
      label: "Add business working hours",
      description: "Working hours help BizReply know when your business is available.",
      route: "/settings/business/availability",
      requiredFor: "AI_AUTOMATION",
      planRequired: "BASIC",
    },
    {
      key: "business-policies",
      label: "Add terms and policies",
      description: "Policies help BizReply answer safely about payments, cancellations, delays, and fees.",
      route: "/settings/business/policies",
      requiredFor: "AI_AUTOMATION",
      planRequired: "BASIC",
    },
  ],
  completedItems: [
    { key: "businessBasicInfo", label: "Complete business contact information" },
    { key: "industryDescription", label: "Add industry and business description" },
  ],
  nextRecommendedStep: {
    key: "location",
    label: "Add business country and city",
    route: "/settings/business/profile",
  },
  serviceProgress: {
    servicesAdded: 2,
    servicesWithPricing: 1,
    servicesReadyForAi: 1,
    servicesReadyForBooking: 1,
    missingServicePrices: 1,
    missingServiceDurations: 1,
  },
};

export const mockBusinessSetupService = {
  async status(): Promise<BusinessSetupStatus> {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const policies = getMockPoliciesSummary();
    const policyComplete = policies.customerFacing > 0;
    return {
      ...mockBusinessSetupStatus,
      completionPercentage: mockBusinessSetupStatus.completionPercentage + (policyComplete ? 5 : 0),
      missingItems: mockBusinessSetupStatus.missingItems.filter((item) => item.key !== "business-policies" || !policyComplete),
      completedItems: policyComplete
        ? [...mockBusinessSetupStatus.completedItems, { key: "business-policies", label: "Add business policies" }]
        : mockBusinessSetupStatus.completedItems,
      policyProgress: {
        policiesAdded: policies.total - policies.archived,
        customerFacingPolicies: policies.customerFacing,
        missingRecommendedPolicyCategories: policies.missingRecommendedCategories,
      },
    };
  },
};
