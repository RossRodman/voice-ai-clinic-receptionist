import { Box, Card, Stack, Tooltip, Typography } from "@mui/material";

import { Styled } from "@/styled";
import type { DayStats } from "@/types";

import { dayLabel, plural, shortDate, weekday } from "../../format";

const CHART_HEIGHT = 160;

const BOOKED = "primary.main";

const OTHER = "rgb(var(--mui-palette-text-primaryChannel) / 0.18)";

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: color }} />
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
    </Stack>
  );
}

const tickEvery = (days: number) => (days <= 7 ? 1 : days <= 14 ? 2 : 7);

export function CallsPerDay({ perDay }: { perDay: DayStats[] }) {
  const max = Math.max(1, ...perDay.map((d) => d.calls));
  const every = tickEvery(perDay.length);
  const tick = perDay.length <= 7 ? weekday : shortDate;

  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack
        direction="row"
        sx={{ alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}
      >
        <Typography id="calls-per-day-title" sx={{ fontWeight: 600 }}>
          Calls per day
        </Typography>
        <Stack direction="row" spacing={2}>
          <Swatch color={BOOKED} label="Booked" />
          <Swatch color={OTHER} label="Other calls" />
        </Stack>
      </Stack>

      <Box sx={{ position: "relative", mt: 3, height: CHART_HEIGHT }} aria-hidden="true">
        <Typography
          variant="caption"
          sx={{ position: "absolute", top: -9, left: 0, color: "text.secondary", lineHeight: 1 }}
        >
          {max}
        </Typography>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            left: 24,
            borderTop: 1,
            borderBottom: 1,
            borderColor: "divider",
            borderTopStyle: "dashed",
          }}
        />
        <Stack
          direction="row"
          sx={{ position: "absolute", inset: 0, left: 24, alignItems: "flex-end", gap: "2px" }}
        >
          {perDay.map((day) => {
            const other = day.calls - day.booked;

            return (
              <Tooltip
                key={day.date}
                title={`${dayLabel(day.date)}: ${plural(day.calls, "call")}, ${day.booked} booked`}
                placement="top"
                disableInteractive
              >
                <Stack
                  data-testid="day-bar"
                  sx={{
                    flex: 1,
                    height: "100%",
                    justifyContent: "flex-end",
                    gap: "2px",
                    px: { xs: "1px", sm: perDay.length > 14 ? "1px" : 1 },
                    borderRadius: 1,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  {other > 0 && (
                    <Box
                      sx={{
                        height: `${(other / max) * 100}%`,
                        bgcolor: OTHER,
                        borderRadius: "4px 4px 0 0",
                      }}
                    />
                  )}
                  {day.booked > 0 && (
                    <Box
                      sx={{
                        height: `${(day.booked / max) * 100}%`,
                        bgcolor: BOOKED,
                        borderRadius: other > 0 ? 0 : "4px 4px 0 0",
                      }}
                    />
                  )}
                </Stack>
              </Tooltip>
            );
          })}
        </Stack>
      </Box>

      <Stack direction="row" sx={{ ml: "24px", mt: 1, gap: "2px" }} aria-hidden="true">
        {perDay.map((day, i) => (
          <Typography
            key={day.date}
            variant="caption"
            sx={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
              whiteSpace: "nowrap",
              color: "text.secondary",
            }}
          >
            {(perDay.length - 1 - i) % every === 0 ? tick(day.date) : ""}
          </Typography>
        ))}
      </Stack>

      <Box component="table" sx={Styled.VisuallyHidden} aria-labelledby="calls-per-day-title">
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Calls</th>
            <th scope="col">Booked</th>
          </tr>
        </thead>
        <tbody>
          {perDay.map((day) => (
            <tr key={day.date}>
              <th scope="row">{dayLabel(day.date)}</th>
              <td>{day.calls}</td>
              <td>{day.booked}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Card>
  );
}
