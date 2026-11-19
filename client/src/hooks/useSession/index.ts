import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => api.session(signal),
    staleTime: Infinity,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) => api.signIn(password),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.session, { required: true, signedIn: true });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.signOut(),
    onSettled: () => {
      queryClient.setQueryData(queryKeys.session, { required: true, signedIn: false });
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
    },
  });
}
