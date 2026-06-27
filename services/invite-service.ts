import { apiRequest } from "@/lib/api-client";
import { businessStore } from "@/lib/business-store";
import { env } from "@/lib/env";
import { tokenStore } from "@/lib/token-store";
import { mockInviteService } from "@/services/mock-invite-service";
import type { InviteAcceptResponse, InviteDetails, SignupFromInviteInput } from "@/types/auth";

function applyInviteSession(response: InviteAcceptResponse) {
  if (response.accessToken && response.refreshToken) {
    tokenStore.setTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
  }
  if (response.activeBusinessId) businessStore.set(response.activeBusinessId);
  return response;
}

function normalizeInviteResponse(response: InviteDetails | { invite: InviteDetails }) {
  return "invite" in response ? response.invite : response;
}

export const inviteService = {
  async getByToken(token: string) {
    const response = env.useMockApi
      ? await mockInviteService.getByToken(token)
      : await apiRequest<InviteDetails | { invite: InviteDetails }>(`/invites/${encodeURIComponent(token)}`);
    return normalizeInviteResponse(response);
  },
  async signup(token: string, input: SignupFromInviteInput) {
    const response = env.useMockApi
      ? await mockInviteService.signup(token, input)
      : await apiRequest<InviteAcceptResponse>(`/invites/${encodeURIComponent(token)}/signup`, { method: "POST", body: JSON.stringify(input) });
    return applyInviteSession(response);
  },
  async accept(token: string) {
    const response = env.useMockApi
      ? await mockInviteService.accept(token)
      : await apiRequest<InviteAcceptResponse>(`/invites/${encodeURIComponent(token)}/accept`, { method: "POST" });
    return applyInviteSession(response);
  },
};
