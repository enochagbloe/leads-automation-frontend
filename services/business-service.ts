import { apiRequest } from "@/lib/api-client";
import type { AcceptInvitationInput, ApiMessage, Business, BusinessMembership, InviteMemberInput, InviteMemberResponse } from "@/types/auth";
import type { BusinessOnboardingInput } from "@/types/onboarding";

export const businessService = {
  listMemberships: () => apiRequest<BusinessMembership[]>("/businesses"),
  create: (input: BusinessOnboardingInput) => apiRequest<{ business: Business; message: string }>("/businesses", { method: "POST", body: JSON.stringify(input) }),
  inviteMember: (input: InviteMemberInput) => apiRequest<InviteMemberResponse>("/businesses/invitations", { method: "POST", body: JSON.stringify(input) }),
  acceptInvitation: (input: AcceptInvitationInput) => apiRequest<ApiMessage>("/businesses/invitations/accept", { method: "POST", body: JSON.stringify(input) }),
};
