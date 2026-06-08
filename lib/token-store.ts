import { businessStore } from "@/lib/business-store";

const REFRESH_TOKEN_KEY = "bizreply_refresh_token";
let accessToken: string | null = null;

export const tokenStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => typeof window === "undefined" ? null : localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens(tokens: { accessToken: string; refreshToken: string }) {
    accessToken = tokens.accessToken;
    if (typeof window !== "undefined") {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      document.cookie = "bizreply_session=active; path=/; max-age=2592000; samesite=lax";
    }
  },
  clear() {
    accessToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      businessStore.clear();
      document.cookie = "bizreply_session=; path=/; max-age=0; samesite=lax";
    }
  },
};
