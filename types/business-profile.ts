export const BUSINESS_INDUSTRIES = [
  "REAL_ESTATE",
  "CONSTRUCTION",
  "ARCHITECTURE",
  "CONSULTING",
  "SALON_BEAUTY",
  "CLINIC_HEALTHCARE",
  "HOTEL_HOSPITALITY",
  "ONLINE_STORE",
  "EDUCATION",
  "LEGAL",
  "FINANCE",
  "OTHER",
] as const;

export type BusinessIndustry = (typeof BUSINESS_INDUSTRIES)[number];

export interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  description: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  serviceArea: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  timezone: string;
  defaultCurrency: string;
  defaultNotificationEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateBusinessProfileInput = Partial<Omit<BusinessProfile, "id" | "createdAt" | "updatedAt">>;
