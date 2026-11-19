import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useState } from "react";

import { QueryState, SectionHeader } from "@/components";
import { useStats } from "@/hooks/useStats";

import { CallsPerDay } from "../callsPerDay";
import { OutcomeBreakdown } from "../outcomeBreakdown";
import { StatTiles } from "../statTiles";

const PERIODS = [7, 30] as const;

export function Overview() {
  const [days, setDays] = useState<number>(7);
  const stats = useStats(days);

  return (
    <Box component="section" aria-labelledby="overview-title">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { sm: "flex-end" } }}
      >
        <Box>
          <SectionHeader
            id="overview-title"
            title="Overview"
            description="How the assistant has done lately, by day in the clinic's time zone."
          />
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={days}
          onChange={(_event, value: number | null) => {
            if (value) {
              setDays(value);
            }
          }}
          aria-label="Period"
        >
          {PERIODS.map((period) => (
            <ToggleButton key={period} value={period} sx={{ px: 2 }}>
              {period} days
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <Box sx={{ mt: 3 }}>
        <QueryState query={stats} rows={3}>
          {(data) => (
            <Stack spacing={2}>
              <StatTiles stats={data} />
              {data.totals.calls === 0 && (
                <Typography sx={{ color: "text.secondary" }}>
                  No calls in the last {data.days} days yet. Run npm run demo:call in server/ to
                  send a few through the webhook.
                </Typography>
              )}
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" },
                }}
              >
                <CallsPerDay perDay={data.perDay} />
                <OutcomeBreakdown stats={data} />
              </Box>
            </Stack>
          )}
        </QueryState>
      </Box>
    </Box>
  );
}
