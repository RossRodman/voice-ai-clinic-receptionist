import type { CallFilterOutcome, CallFilters } from "@/types";

export const OUTCOME_FILTERS: { value: CallFilterOutcome; label: string }[] = [
  { value: "in-progress", label: "Live" },
  { value: "booked", label: "Booked" },
  { value: "transferred", label: "Transferred" },
  { value: "answered", label: "Answered" },
  { value: "hung-up", label: "Hung up" },
  { value: "failed", label: "Failed" },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function filtersFromParams(params: URLSearchParams): CallFilters {
  const outcome = OUTCOME_FILTERS.find((o) => o.value === params.get("outcome"))?.value;
  const from = params.get("from");
  const to = params.get("to");
  const q = params.get("q")?.trim();

  return {
    ...(outcome ? { outcome } : {}),
    ...(from && DATE_RE.test(from) ? { from } : {}),
    ...(to && DATE_RE.test(to) ? { to } : {}),
    ...(q ? { q } : {}),
  };
}

export function filtersToParams(filters: CallFilters): URLSearchParams {
  const entries = Object.entries(filters).filter(([, value]) => value);

  return new URLSearchParams(entries as [string, string][]);
}

export const hasFilters = (filters: CallFilters) => Object.keys(filters).length > 0;
