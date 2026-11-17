export const queryKeys = {
  health: ["health"] as const,
  clinic: ["clinic"] as const,
  knowledgeBase: ["knowledge-base"] as const,
  knowledgeSearch: (q: string) => ["knowledge-base", "search", q] as const,
};
