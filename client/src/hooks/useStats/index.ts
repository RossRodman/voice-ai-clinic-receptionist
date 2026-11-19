import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";

export function useStats(days: number) {
  return useQuery({
    queryKey: queryKeys.stats(days),
    queryFn: ({ signal }) => api.stats(days, signal),
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });
}
