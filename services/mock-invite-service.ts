import { ApiError } from "@/lib/api-client";
import type { InviteAcceptResponse, InviteDetails, SignupFromInviteInput } from "@/types/auth";

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

function inviteError(code: string, message: string, status = 400) {
  return new ApiError(code, message, status);
}

function statusFromToken(token: string): InviteDetails["status"] {
  const normalized = token.toLowerCase();
  if (normalized.includes("expired")) return "EXPIRED";
  if (normalized.includes("cancelled") || normalized.includes("canceled")) return "CANCELLED";
  if (normalized.includes("accepted")) return "ACCEPTED";
  return "PENDING";
}

export const mockInviteService = {
  async getByToken(token: string): Promise<InviteDetails> {
    await delay();
    if (!token || token.toLowerCase().includes("invalid")) {
      throw inviteError("INVITE_INVALID_OR_EXPIRED", "This invite link is invalid or has expired. Ask your organization to send a new invite.", 404);
    }
    return {
      id: `invite_${token}`,
      token,
      email: token.toLowerCase().includes("owner") ? "owner@example.com" : "staff@example.com",
      role: token.toLowerCase().includes("manager") ? "MANAGER" : "STAFF",
      status: statusFromToken(token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
      business: { id: "biz_demo_invited", name: "Enoch Properties", logoUrl: null },
    };
  },
  async signup(token: string, input: SignupFromInviteInput): Promise<InviteAcceptResponse> {
    await delay(900);
    const normalized = token.toLowerCase();
    if (normalized.includes("exists")) throw inviteError("USER_ALREADY_EXISTS", "An account already exists for this email. Please log in to accept the invite.", 409);
    if (normalized.includes("owner")) throw inviteError("INVITED_EMAIL_ALREADY_BUSINESS_OWNER", "This email is already linked to a business owner account. Please use a staff-only email.", 409);
    void input;
    return {
      message: "Invite accepted.",
      accessToken: "mock-staff-access-token",
      refreshToken: "mock-staff-refresh-token",
      activeBusinessId: "biz_demo_invited",
      activeMembershipId: "member_demo_invited",
      role: "STAFF",
    };
  },
  async accept(token: string): Promise<InviteAcceptResponse> {
    await delay(750);
    if (token.toLowerCase().includes("mismatch")) {
      throw inviteError("INVITE_EMAIL_MISMATCH", "This invite was sent to a different email address. Please log in with the invited email.", 403);
    }
    return {
      message: "Invite accepted.",
      activeBusinessId: "biz_demo_invited",
      activeMembershipId: "member_demo_invited",
      role: token.toLowerCase().includes("manager") ? "MANAGER" : "STAFF",
    };
  },
};
