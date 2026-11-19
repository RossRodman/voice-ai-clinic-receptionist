import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";
import type { CallFilters } from "@/types";

const REFRESH_MS = 15_000;
const LIVE_REFRESH_MS = 5_000;

export function useCalls(filters: CallFilters = {}) {
  return useQuery({
    queryKey: queryKeys.calls(filters),
    queryFn: ({ signal }) => api.calls(filters, signal),
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  });
}

export function useCall(id: string) {
  return useQuery({
    queryKey: queryKeys.call(id),
    queryFn: ({ signal }) => api.call(id, signal),
    refetchInterval: (query) =>
      query.state.data?.call.status === "in-progress" ? LIVE_REFRESH_MS : false,
  });
}
