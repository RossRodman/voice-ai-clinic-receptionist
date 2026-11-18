import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";
import type { AvailabilityParams, ScheduleParams } from "@/types";

const REFRESH_MS = 60_000;

export function useSchedule(params: ScheduleParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.schedule(params),
    queryFn: ({ signal }) => api.schedule(params, signal),
    enabled,
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  });
}

export function useAvailability(params: AvailabilityParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.availability(params),
    queryFn: ({ signal }) => api.availability(params, signal),
    enabled,
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  });
}

export function useAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments,
    queryFn: ({ signal }) => api.appointments(signal),
    refetchInterval: REFRESH_MS,
  });
}
