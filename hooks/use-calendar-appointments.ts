"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/use-auth";
import { useLeads } from "@/hooks/use-leads";
import { queryKeys } from "@/lib/query-keys";
import { appointmentService } from "@/services/appointment-service";
import { leadService } from "@/services/lead-service";
import type {
  AssignAppointmentInput,
  AppointmentAssigneeOption,
  AppointmentCalendarQuery,
  AppointmentListQuery,
  CancelAppointmentInput,
  CheckAppointmentAvailabilityInput,
  RescheduleAppointmentInput,
} from "@/types/appointment";

export const useCalendarAppointments = (businessId: string | null | undefined, query: AppointmentCalendarQuery) => useQuery({
  queryKey: queryKeys.calendarAppointments.calendar(businessId ?? "", query),
  queryFn: () => appointmentService.calendar(query),
  enabled: Boolean(businessId),
});

export const useAppointments = (businessId: string | null | undefined, query: AppointmentListQuery) => useQuery({
  queryKey: queryKeys.businessAppointments.list(businessId ?? "", query),
  queryFn: () => appointmentService.list(query),
  enabled: Boolean(businessId),
});

export const useAppointment = (businessId: string | null | undefined, appointmentId: string | null | undefined) => useQuery({
  queryKey: queryKeys.businessAppointments.detail(businessId ?? "", appointmentId ?? ""),
  queryFn: () => appointmentService.detail(appointmentId!),
  enabled: Boolean(businessId && appointmentId),
});

export const useCheckAppointmentAvailability = () => useMutation({
  mutationFn: (input: CheckAppointmentAvailabilityInput) => appointmentService.checkAvailability(input),
});

async function invalidateAppointmentQueries(client: ReturnType<typeof useQueryClient>, businessId?: string | null, appointmentId?: string | null, leadId?: string | null, conversationId?: string | null) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.calendarAppointments.all }),
    client.invalidateQueries({ queryKey: queryKeys.businessAppointments.all }),
    client.invalidateQueries({ queryKey: queryKeys.businessSetup.all }),
    client.invalidateQueries({ queryKey: queryKeys.businessKnowledge.all }),
    client.invalidateQueries({ queryKey: queryKeys.auth.currentUser }),
    ...(businessId ? [
      client.invalidateQueries({ queryKey: queryKeys.calendarAppointments.business(businessId) }),
      client.invalidateQueries({ queryKey: queryKeys.businessAppointments.business(businessId) }),
    ] : []),
    ...(businessId && appointmentId ? [client.invalidateQueries({ queryKey: queryKeys.businessAppointments.detail(businessId, appointmentId) })] : []),
    ...(leadId ? [client.invalidateQueries({ queryKey: queryKeys.leads.detail(leadId) })] : []),
    ...(conversationId ? [client.invalidateQueries({ queryKey: queryKeys.conversations.detail(conversationId) })] : []),
  ]);
}

export function useCreateAppointment(businessId: string | null | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: appointmentService.create,
    onSuccess: async (appointment) => invalidateAppointmentQueries(client, businessId, appointment.id, appointment.leadId, appointment.conversationId),
  });
}

export function useRescheduleAppointment(businessId: string | null | undefined, appointmentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RescheduleAppointmentInput) => appointmentService.reschedule(appointmentId, input),
    onSuccess: async (appointment) => invalidateAppointmentQueries(client, businessId, appointment.id, appointment.leadId, appointment.conversationId),
  });
}

export function useCancelAppointment(businessId: string | null | undefined, appointmentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CancelAppointmentInput) => appointmentService.cancel(appointmentId, input),
    onSuccess: async (appointment) => invalidateAppointmentQueries(client, businessId, appointment.id, appointment.leadId, appointment.conversationId),
  });
}

export function useCompleteAppointment(businessId: string | null | undefined, appointmentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => appointmentService.complete(appointmentId),
    onSuccess: async (appointment) => invalidateAppointmentQueries(client, businessId, appointment.id, appointment.leadId, appointment.conversationId),
  });
}

export function useNoShowAppointment(businessId: string | null | undefined, appointmentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => appointmentService.noShow(appointmentId),
    onSuccess: async (appointment) => invalidateAppointmentQueries(client, businessId, appointment.id, appointment.leadId, appointment.conversationId),
  });
}

export function useAssignAppointment(businessId: string | null | undefined, appointmentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignAppointmentInput) => appointmentService.assign(appointmentId, input),
    onSuccess: async (appointment) => invalidateAppointmentQueries(client, businessId, appointment.id, appointment.leadId, appointment.conversationId),
  });
}

export function useBusinessLeads(businessId: string | null | undefined, search = "") {
  return useQuery({
    queryKey: queryKeys.businessLeads.list(businessId ?? "", search),
    queryFn: () => leadService.list({ page: 1, limit: 100, search: search || undefined, sortBy: "updatedAt", sortOrder: "desc" }),
    enabled: Boolean(businessId),
  });
}

export function useBusinessMembers(businessId: string | null | undefined) {
  const profile = useCurrentUser();
  const leads = useLeads({ page: 1, limit: 100, sortBy: "updatedAt", sortOrder: "desc" }, Boolean(businessId));

  return useMemo(() => {
    const map = new Map<string, AppointmentAssigneeOption>();
    if (profile.data?.membership) {
      map.set(profile.data.membership.id, {
        id: profile.data.membership.id,
        name: `${profile.data.user.firstName} ${profile.data.user.lastName}`,
        email: profile.data.user.email,
        role: profile.data.membership.role,
      });
    }
    for (const lead of leads.data?.data ?? []) {
      if (!lead.assignedStaff) continue;
      map.set(lead.assignedStaff.id, {
        id: lead.assignedStaff.id,
        name: `${lead.assignedStaff.user.firstName} ${lead.assignedStaff.user.lastName}`,
        email: lead.assignedStaff.user.email,
        role: lead.assignedStaff.role,
      });
    }
    return {
      data: [...map.values()],
      isPending: profile.isPending || leads.isPending,
      isError: profile.isError || leads.isError,
      refetch: leads.refetch,
    };
  }, [leads.data?.data, leads.isError, leads.isPending, leads.refetch, profile.data, profile.isError, profile.isPending]);
}
