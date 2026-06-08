import { apiRequest } from "@/lib/api-client";
import { env } from "@/lib/env";
import { tokenStore } from "@/lib/token-store";
import { mockAuthService } from "@/services/mock-auth-service";
import type { ApiMessage, AuthProfile, EmailInput, LoginInput, LoginResponse, RegisterInput, RegisterResponse, ResetPasswordInput, VerifyEmailInput } from "@/types/auth";

export const authService = {
  async login(input: LoginInput) {
    const response = env.useMockApi ? await mockAuthService.login(input) : await apiRequest<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) });
    tokenStore.setTokens(response);
    if (response.activeBusiness) {
      const { businessStore } = await import("@/lib/business-store");
      businessStore.set(response.activeBusiness.id);
    }
    return response;
  },
  register: (input: RegisterInput) => env.useMockApi ? mockAuthService.register(input) : apiRequest<RegisterResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  async logout() {
    const refreshToken = tokenStore.getRefreshToken();
    try {
      return env.useMockApi ? await mockAuthService.logout() : await apiRequest<ApiMessage>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) });
    } finally {
      tokenStore.clear();
    }
  },
  verifyEmail: (input: VerifyEmailInput) => env.useMockApi ? mockAuthService.verifyEmail(input) : apiRequest<ApiMessage>("/auth/verify-email", { method: "POST", body: JSON.stringify(input) }),
  resendVerification: (input: EmailInput) => env.useMockApi ? mockAuthService.resendVerification(input) : apiRequest<ApiMessage>("/auth/resend-verification", { method: "POST", body: JSON.stringify(input) }),
  forgotPassword: (input: EmailInput) => env.useMockApi ? mockAuthService.forgotPassword(input) : apiRequest<ApiMessage>("/auth/forgot-password", { method: "POST", body: JSON.stringify(input) }),
  resetPassword: (input: ResetPasswordInput) => env.useMockApi ? mockAuthService.resetPassword(input) : apiRequest<ApiMessage>("/auth/reset-password", { method: "POST", body: JSON.stringify(input) }),
  currentUser: () => env.useMockApi ? mockAuthService.currentUser() : apiRequest<AuthProfile>("/auth/me"),
};
