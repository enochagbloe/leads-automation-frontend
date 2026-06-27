const ACTIVE_BUSINESS_KEY = "bizreply_active_business_id";
const ACTIVE_MEMBERSHIP_KEY = "bizreply_active_membership_id";
export const BUSINESS_ACCESS_DENIED_EVENT = "bizreply:business-access-denied";

export const businessStore = {
  get: () => typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_BUSINESS_KEY),
  getMembership: () => typeof window === "undefined" ? null : localStorage.getItem(ACTIVE_MEMBERSHIP_KEY),
  set(id: string) {
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_BUSINESS_KEY, id);
  },
  setMembership(id: string) {
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_MEMBERSHIP_KEY, id);
  },
  clear() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_BUSINESS_KEY);
      localStorage.removeItem(ACTIVE_MEMBERSHIP_KEY);
    }
  },
};
