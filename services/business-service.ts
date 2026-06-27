import { ApiError, apiRequest } from "@/lib/api-client";
import { businessStore } from "@/lib/business-store";
import { env } from "@/lib/env";
import type { AcceptInvitationInput, ApiMessage, Business, BusinessMemberOption, BusinessMembership, BusinessMembershipItem, InviteMemberInput, InviteMemberResponse, SwitchBusinessResponse } from "@/types/auth";
import type { BusinessOnboardingInput } from "@/types/onboarding";

type BusinessMembershipListResponse =
  | BusinessMembership[]
  | Business[]
  | BusinessMembershipItem[]
  | {
      data?: BusinessMembership[] | Business[] | BusinessMembershipItem[];
      businesses?: BusinessMembership[] | Business[];
      memberships?: BusinessMembership[] | BusinessMembershipItem[];
    };
type BusinessMembersResponse = BusinessMemberOption[] | { data?: BusinessMemberOption[]; members?: BusinessMemberOption[]; memberships?: BusinessMemberOption[] };

function hasBusiness(value: Business | BusinessMembership | BusinessMembershipItem): value is BusinessMembership {
  return "business" in value;
}

function isMembershipItem(value: Business | BusinessMembership | BusinessMembershipItem): value is BusinessMembershipItem {
  return "businessId" in value && "businessName" in value;
}

function fallbackBusiness(id: string, name: string, logoUrl?: string | null): Business {
  return {
    id,
    name,
    industry: "",
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || id,
    ownerId: "",
    email: "",
    phone: null,
    status: "ACTIVE",
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
    ...(logoUrl ? { logoUrl } : {}),
  } as Business;
}

function toMembership(value: Business | BusinessMembership | BusinessMembershipItem): BusinessMembership {
  if (hasBusiness(value)) return value;
  if (isMembershipItem(value)) {
    return {
      id: value.membershipId,
      role: value.role,
      status: value.status,
      joinedAt: value.lastAccessedAt ?? null,
      positionTitle: value.positionTitle,
      specialties: value.specialties,
      serviceTags: value.serviceTags,
      isAiHandoffEligible: value.isAiHandoffEligible,
      accountType: value.accountType,
      canCreateBusiness: value.canCreateBusiness,
      lastAccessedAt: value.lastAccessedAt,
      business: fallbackBusiness(value.businessId, value.businessName, value.businessLogoUrl),
    };
  }
  return {
    id: `business-${value.id}`,
    role: "STAFF",
    status: "ACTIVE",
    joinedAt: null,
    business: value,
  };
}

function normalizeMemberships(response: BusinessMembershipListResponse): BusinessMembership[] {
  const list = Array.isArray(response)
    ? response
    : response.memberships ?? response.businesses ?? response.data ?? [];

  return Array.isArray(list) ? list.map(toMembership) : [];
}

function applySwitchResponse(response: SwitchBusinessResponse, selectedBusinessId: string) {
  const businessId = response.business?.id ?? response.activeBusinessId ?? selectedBusinessId;
  const membershipId = response.membership?.id ?? response.activeMembershipId;
  businessStore.set(businessId);
  if (membershipId) businessStore.setMembership(membershipId);
  return response;
}

function mockMemberships(): BusinessMembership[] {
  const now = new Date().toISOString();
  return [
    {
      id: "member_demo",
      role: "BUSINESS_OWNER",
      status: "ACTIVE",
      joinedAt: now,
      accountType: "OWNER_CAPABLE",
      canCreateBusiness: true,
      business: fallbackBusiness("biz_demo", "Demo Business"),
    },
    {
      id: "member_demo_staff",
      role: "STAFF",
      status: "ACTIVE",
      joinedAt: now,
      accountType: "OWNER_CAPABLE",
      canCreateBusiness: true,
      positionTitle: "Support specialist",
      specialties: ["Site visits", "Customer follow-up"],
      serviceTags: ["Inspection", "Consultation"],
      business: fallbackBusiness("biz_demo_staff", "Enoch Properties"),
    },
  ];
}

function normalizeBusinessMembers(response: BusinessMembersResponse): BusinessMemberOption[] {
  if (Array.isArray(response)) return response;
  const list = response.memberships ?? response.members ?? response.data ?? [];
  return Array.isArray(list) ? list : [];
}

function mockBusinessMembers(): BusinessMemberOption[] {
  return [
    {
      id: "member_demo",
      membershipId: "member_demo",
      role: "BUSINESS_OWNER",
      status: "ACTIVE",
      canReceiveAssignedWork: false,
      positionTitle: "Owner",
      specialties: [],
      serviceTags: [],
      isAiHandoffEligible: false,
      user: { id: "usr_demo", firstName: "Amara", lastName: "Mensah", email: "demo@bizreply.ai" },
    },
    {
      id: "member_demo_staff",
      membershipId: "member_demo_staff",
      role: "STAFF",
      status: "ACTIVE",
      canReceiveAssignedWork: true,
      positionTitle: "Support specialist",
      specialties: ["Customer follow-up", "Site visits"],
      serviceTags: ["Inspection", "Consultation"],
      isAiHandoffEligible: true,
      user: { id: "usr_staff", firstName: "Kwame", lastName: "Mensah", email: "kwame@example.com" },
    },
    {
      id: "member_demo_manager",
      membershipId: "member_demo_manager",
      role: "MANAGER",
      status: "ACTIVE",
      canReceiveAssignedWork: true,
      positionTitle: "Operations manager",
      specialties: ["Escalations"],
      serviceTags: ["Consultation"],
      isAiHandoffEligible: true,
      user: { id: "usr_manager", firstName: "Sarah", lastName: "Boateng", email: "sarah@example.com" },
    },
  ];
}

export const businessService = {
  async listMemberships() {
    if (env.useMockApi) return mockMemberships();
    let response: BusinessMembershipListResponse;
    try {
      response = await apiRequest<BusinessMembershipListResponse>("/me/business-memberships");
    } catch (error) {
      if (!(error instanceof ApiError) || ![404, 405].includes(error.status)) throw error;
      response = await apiRequest<BusinessMembershipListResponse>("/businesses");
    }
    return normalizeMemberships(response);
  },
  async switchBusiness(businessId: string) {
    if (env.useMockApi && !mockMemberships().some((item) => item.business.id === businessId)) throw new ApiError("BUSINESS_MEMBERSHIP_NOT_FOUND", "You do not have access to this business.", 404);
    return applySwitchResponse({ activeBusinessId: businessId }, businessId);
  },
  async listMembers() {
    if (env.useMockApi) return mockBusinessMembers();
    return normalizeBusinessMembers(await apiRequest<BusinessMembersResponse>("/business/members"));
  },
  create: (input: BusinessOnboardingInput) => apiRequest<{ business: Business; message: string }>("/businesses", { method: "POST", body: JSON.stringify(input) }),
  inviteMember: (input: InviteMemberInput) => apiRequest<InviteMemberResponse>("/businesses/invitations", { method: "POST", body: JSON.stringify(input) }),
  acceptInvitation: (input: AcceptInvitationInput) => apiRequest<ApiMessage>("/businesses/invitations/accept", { method: "POST", body: JSON.stringify(input) }),
};
