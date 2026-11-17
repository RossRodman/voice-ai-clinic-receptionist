import { useQuery } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";

export function useClinic() {
  return useQuery({
    queryKey: queryKeys.clinic,
    queryFn: ({ signal }) => api.clinic(signal),
    staleTime: Infinity,
  });
}
