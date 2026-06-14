import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

const BUSINESS_SCOPED_QUERY_KEYS = [
  queryKeys.whatsapp.all,
  queryKeys.businessSetup.all,
  queryKeys.businessProfile.all,
  queryKeys.businessServices.all,
  queryKeys.leads.all,
  queryKeys.conversations.all,
] as const;

export async function resetBusinessContext(client: QueryClient) {
  await Promise.all([
    ...BUSINESS_SCOPED_QUERY_KEYS.map((queryKey) => client.cancelQueries({ queryKey })),
    client.cancelQueries({ queryKey: queryKeys.auth.currentUser }),
    client.cancelQueries({ queryKey: queryKeys.subscription.current }),
  ]);
  for (const queryKey of BUSINESS_SCOPED_QUERY_KEYS) client.removeQueries({ queryKey });
  await Promise.all([
    client.resetQueries({ queryKey: queryKeys.auth.currentUser }),
    client.resetQueries({ queryKey: queryKeys.subscription.current }),
  ]);
}
