import { env } from "@/lib/env";
import { BUSINESS_ACCESS_DENIED_EVENT, businessStore } from "@/lib/business-store";
import { tokenStore } from "@/lib/token-store";
import type { ApiErrorResponse, RefreshResponse } from "@/types/auth";
import type { PlanCode } from "@/types/subscription";

export const SUBSCRIPTION_REQUIRED_EVENT = "bizreply:subscription-required";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, string[]>,
    public currentPlan?: PlanCode,
    public recommendedPlan?: PlanCode,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshPromise: Promise<boolean> | null = null;
const nonRefreshablePaths = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/refresh",
]);

async function refreshSession() {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${env.apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    if ([400, 401, 422].includes(response.status)) tokenStore.clear();
    if (response.status >= 500 || response.status === 429) {
      throw new Error("Unable to refresh session. Please try again.");
    }
    return false;
  }
  tokenStore.setTokens(await response.json() as RefreshResponse);
  return true;
}

export function refreshAccessToken() {
  refreshPromise ??= refreshSession().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit, allowRefresh: boolean): Promise<T> {
  const accessToken = tokenStore.getAccessToken();
  const activeBusinessId = businessStore.get();
  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(activeBusinessId ? { "X-Business-Id": activeBusinessId } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401 && allowRefresh && tokenStore.getRefreshToken()) {
    if (await refreshAccessToken()) {
      try {
        return await request<T>(path, init, false);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) tokenStore.clear();
        throw error;
      }
    }
  }

  const body = await response.json().catch(() => null) as ApiErrorResponse | T | null;
  if (!response.ok) {
    const responseError = body as ApiErrorResponse | null;
    const error = responseError?.error ?? responseError;
    if (error?.code === "BUSINESS_ACCESS_DENIED") {
      businessStore.clear();
      if (path !== "/auth/me" && typeof window !== "undefined") window.dispatchEvent(new Event(BUSINESS_ACCESS_DENIED_EVENT));
    }
    if (error?.code === "SUBSCRIPTION_REQUIRED" && typeof window !== "undefined") {
      window.dispatchEvent(new Event(SUBSCRIPTION_REQUIRED_EVENT));
    }
    if (response.status === 401 && allowRefresh) tokenStore.clear();
    throw new ApiError(
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "Request failed. Please try again.",
      response.status,
      error?.details,
      error?.currentPlan,
      error?.recommendedPlan,
    );
  }
  return body as T;
}

export function apiRequest<T>(path: string, init: RequestInit = {}) {
  return request<T>(path, init, !nonRefreshablePaths.has(path));
}

export function getApiErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function isPlanLimitError(error: unknown): error is ApiError {
  return error instanceof ApiError && ["PLAN_LIMIT_REACHED", "PLAN_LIMIT_EXCEEDED"].includes(error.code);
}
