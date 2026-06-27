"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { plansService } from "@/services/plans-service";
import { subscriptionService } from "@/services/subscription-service";

export const usePlans = () => useQuery({ queryKey: queryKeys.plans.all, queryFn: plansService.list });
export const useCurrentSubscription = (enabled = true) => useQuery({ queryKey: queryKeys.subscription.current, queryFn: subscriptionService.current, enabled });
