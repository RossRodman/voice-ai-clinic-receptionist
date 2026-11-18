import { useQuery } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";

export function useAssistant() {
  return useQuery({
    queryKey: queryKeys.assistant,
    queryFn: ({ signal }) => api.assistant(signal),
    staleTime: Infinity,
  });
}
