import { Box, Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { useSearchParams } from "react-router";

import { QueryState, SectionHeader } from "@/components";
import { useCalls } from "@/hooks/useCalls";
import { useClinic } from "@/hooks/useClinic";
import { Styled } from "@/styled";
import type { CallFilters as Filters } from "@/types";

import { CallFilters, CallList, CallLogBadge } from "../../components";
import { filtersFromParams, filtersToParams, hasFilters } from "../../filters";

export function CallsPage() {
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);
  const calls = useCalls(filters);
  const timeZone = useClinic().data?.timezone;

  const changeFilters = useCallback(
    (next: Filters) => {
      setParams(filtersToParams(next), { replace: true });
    },
    [setParams],
  );

  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <Stack spacing={2}>
        <Typography variant="overline" sx={Styled.Eyebrow}>
          Calls
        </Typography>
        <Typography variant="h1">Every call, and what came of it.</Typography>
        <Typography sx={Styled.PageLead}>
          Who called, what they asked, what the assistant looked up and booked, and how the call
          ended. Each call is saved as it happens and completed by Vapi's end-of-call report.
        </Typography>
        {calls.data && (
          <Box>
            <CallLogBadge kind={calls.data.callLog} />
          </Box>
        )}
      </Stack>

      <Box component="section" aria-labelledby="recent-calls-title">
        <SectionHeader
          id="recent-calls-title"
          title="Recent calls"
          description="The latest first. A call on the line right now shows as Live. Dates are in the clinic's time zone."
        />
        <Box sx={{ mt: 3 }}>
          <CallFilters filters={filters} onChange={changeFilters} />
        </Box>
        <Box sx={{ mt: 2 }}>
          <QueryState query={calls} rows={4}>
            {(data) => (
              <CallList
                calls={data.calls}
                filtered={hasFilters(filters)}
                onClearFilters={() => changeFilters({})}
                {...(timeZone ? { timeZone } : {})}
              />
            )}
          </QueryState>
        </Box>
      </Box>
    </Stack>
  );
}
