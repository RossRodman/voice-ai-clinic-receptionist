import type { AvailabilityParams, CallFilters, ScheduleParams } from "@/types";

export const queryKeys = {
  health: ["health"] as const,
  session: ["session"] as const,
  clinic: ["clinic"] as const,
  assistant: ["assistant"] as const,
  knowledgeBase: ["knowledge-base"] as const,
  knowledgeSearch: (q: string) => ["knowledge-base", "search", q] as const,
  schedule: (params: ScheduleParams) => ["schedule", params] as const,
  availability: (params: AvailabilityParams) => ["availability", params] as const,
  appointments: ["appointments"] as const,
  calls: (filters: CallFilters) => ["calls", "list", filters] as const,
  call: (id: string) => ["calls", "detail", id] as const,
  stats: (days: number) => ["stats", days] as const,
};
