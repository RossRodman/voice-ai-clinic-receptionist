import { Box, Card, Typography } from "@mui/material";

import { clock } from "@/features/calls/format";
import { Styled } from "@/styled";
import type { CallStats } from "@/types";

import { percent, plural } from "../../format";

interface Tile {
  label: string;
  value: string;
  detail: string;
}

function tiles({ totals, days }: CallStats): Tile[] {
  return [
    {
      label: "Calls",
      value: String(totals.calls),
      detail: `in the last ${plural(days, "day")}`,
    },
    {
      label: "Booking rate",
      value: totals.bookingRate === null ? "—" : percent(totals.bookingRate),
      detail: `${plural(totals.booked, "call")} ended with a booking`,
    },
    {
      label: "Average call",
      value: totals.averageDurationSeconds === null ? "—" : clock(totals.averageDurationSeconds),
      detail: "minutes on the line",
    },
    {
      label: "Transferred",
      value: String(totals.transferred),
      detail: "put through to the front desk",
    },
  ];
}

export function StatTiles({ stats }: { stats: CallStats }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
      }}
    >
      {tiles(stats).map((tile) => (
        <Card key={tile.label} sx={{ p: 2.5 }}>
          <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
            {tile.label}
          </Typography>
          <Typography
            component="dd"
            sx={[Styled.Mono, { m: 0, mt: 0.5, fontSize: 32, fontWeight: 650, lineHeight: 1.2 }]}
          >
            {tile.value}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {tile.detail}
          </Typography>
        </Card>
      ))}
    </Box>
  );
}
