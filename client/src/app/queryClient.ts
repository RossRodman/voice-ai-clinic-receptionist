import { QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api";
import { queryKeys } from "@/constants";

export function createQueryClient(): QueryClient {
  const signedOut = (error: Error) => {
    if (error instanceof ApiError && error.status === 401) {
      queryClient.setQueryData(queryKeys.session, { required: true, signedIn: false });
    }
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: signedOut }),
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        refetchOnWindowFocus: false,
        retry: (failures, error) =>
          failures < 2 && !(error instanceof ApiError && error.status < 500),
      },
    },
  });

  return queryClient;
}
