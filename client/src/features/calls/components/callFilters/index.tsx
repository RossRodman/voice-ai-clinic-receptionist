import SearchRounded from "@mui/icons-material/SearchRounded";
import { Button, InputAdornment, MenuItem, Stack, TextField } from "@mui/material";
import { useEffect, useState } from "react";

import type { CallFilterOutcome, CallFilters as Filters } from "@/types";

import { hasFilters, OUTCOME_FILTERS } from "../../filters";

const SEARCH_DELAY_MS = 300;

interface CallFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

function without<K extends keyof Filters>(filters: Filters, key: K): Filters {
  const { [key]: _removed, ...rest } = filters;

  return rest;
}

export function CallFilters({ filters, onChange }: CallFiltersProps) {
  const [search, setSearch] = useState(filters.q ?? "");
  const [appliedQ, setAppliedQ] = useState(filters.q);

  if (filters.q !== appliedQ) {
    setAppliedQ(filters.q);

    if ((filters.q ?? "") !== search.trim()) {
      setSearch(filters.q ?? "");
    }
  }

  useEffect(() => {
    const q = search.trim();

    if (q === (filters.q ?? "")) {
      return;
    }

    const timer = setTimeout(() => {
      onChange(q ? { ...filters, q } : without(filters, "q"));
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [search, filters, onChange]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K] | "") => {
    onChange(value ? { ...filters, [key]: value } : without(filters, key));
  };

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.5}
      sx={{ alignItems: { md: "center" } }}
      role="search"
      aria-label="Filter calls"
    >
      <TextField
        size="small"
        label="Search"
        placeholder="Number or summary"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ flex: 1, minWidth: 0 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <TextField
        select
        size="small"
        label="Outcome"
        value={filters.outcome ?? ""}
        onChange={(event) => set("outcome", event.target.value as CallFilterOutcome | "")}
        sx={{ minWidth: 160 }}
      >
        <MenuItem value="">All outcomes</MenuItem>
        {OUTCOME_FILTERS.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>

      <Stack direction="row" spacing={1.5}>
        <TextField
          size="small"
          type="date"
          label="From"
          value={filters.from ?? ""}
          onChange={(event) => set("from", event.target.value)}
          sx={{ flex: 1 }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: filters.to } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={filters.to ?? ""}
          onChange={(event) => set("to", event.target.value)}
          sx={{ flex: 1 }}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: filters.from } }}
        />
      </Stack>

      {hasFilters(filters) && (
        <Button onClick={() => onChange({})} sx={{ flexShrink: 0 }}>
          Clear
        </Button>
      )}
    </Stack>
  );
}
