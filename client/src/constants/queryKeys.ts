import type { AvailabilityParams, ScheduleParams } from "@/types";

export const queryKeys = {
  health: ["health"] as const,
  clinic: ["clinic"] as const,
  knowledgeBase: ["knowledge-base"] as const,
  knowledgeSearch: (q: string) => ["knowledge-base", "search", q] as const,
  schedule: (params: ScheduleParams) => ["schedule", params] as const,
  availability: (params: AvailabilityParams) => ["availability", params] as const,
  appointments: ["appointments"] as const,
};
