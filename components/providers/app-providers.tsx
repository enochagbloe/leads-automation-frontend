"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { ApiError, isPlanLimitError } from "@/lib/api-client";
import { systemNotify } from "@/lib/system-notifications";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error) => {
            if (isPlanLimitError(error) || (error instanceof ApiError && error.code === "PLAN_UPGRADE_REQUIRED")) {
              systemNotify.warning(isPlanLimitError(error) ? "Plan limit reached" : "Upgrade required", { description: error.message, actions: [{ label: error.recommendedPlan ? `View ${error.recommendedPlan.toLowerCase()}` : "View plans", action: "OPEN_URL", href: "/settings/billing" }] });
            }
            if (error instanceof ApiError && error.code === "SUBSCRIPTION_REQUIRED") {
              systemNotify.error("Subscription required", { description: error.message, actions: [{ label: "View plans", action: "OPEN_URL", href: "/settings/billing" }] });
            }
          },
        }),
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
