import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/api";
import { queryKeys } from "@/constants";

export function useKnowledgeBase() {
  return useQuery({
    queryKey: queryKeys.knowledgeBase,
    queryFn: ({ signal }) => api.knowledgeBase(signal),
    staleTime: Infinity,
  });
}

export function useKnowledgeSearch(question: string) {
  return useQuery({
    queryKey: queryKeys.knowledgeSearch(question),
    queryFn: ({ signal }) => api.searchKnowledgeBase(question, signal),
    enabled: question.trim().length > 0,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
}
