import { useQuery } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";

const REFRESH_MS = 15_000;
const LIVE_REFRESH_MS = 5_000;

export function useCalls() {
  return useQuery({
    queryKey: queryKeys.calls,
    queryFn: ({ signal }) => api.calls(signal),
    refetchInterval: REFRESH_MS,
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
