import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { Box, Button, Card, Chip, Stack, Tooltip, Typography } from "@mui/material";

import { Styled } from "@/styled";
import type { ScheduleDay, ScheduleResponse } from "@/types";

import { shortDate } from "../../dates";

interface WeekGridProps {
  schedule: ScheduleResponse;
  providerNames: Map<string, string>;
  onWeek: (direction: -1 | 1) => void;
  isFetching: boolean;
}

function emptyLabel(day: ScheduleDay, today: string): string {
  if (day.closed) {
    return "Closed";
  }

  if (day.date === today) {
    return "Nothing left today";
  }

  return "Fully booked";
}

export function WeekGrid({ schedule, providerNames, onWeek, isFetching }: WeekGridProps) {
  const { days, today } = schedule;
  const first = days[0]?.date ?? today;
  const last = days.at(-1)?.date ?? today;
  const free = days.reduce((sum, day) => sum + day.slots.length, 0);

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="body2" sx={{ flex: 1, color: "text.secondary", minWidth: 200 }}>
          {shortDate(first)} to {shortDate(last)} ·{" "}
          <Box component="span" sx={Styled.Mono}>
            {free}
          </Box>{" "}
          free {free === 1 ? "time" : "times"}
        </Typography>
        <Button
          size="small"
          startIcon={<ChevronLeftRounded />}
          disabled={first <= today || isFetching}
          onClick={() => onWeek(-1)}
        >
          Earlier
        </Button>
        <Button
          size="small"
          endIcon={<ChevronRightRounded />}
          disabled={isFetching}
          onClick={() => onWeek(1)}
        >
          Later
        </Button>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
            xl: "repeat(7, 1fr)",
          },
          opacity: isFetching ? 0.6 : 1,
          transition: "opacity 150ms",
        }}
      >
        {days.map((day) => {
          const [weekday, date] = day.label.split(", ");

          return (
            <Card
              key={day.date}
              component="article"
              aria-label={day.label}
              sx={{
                p: 1.5,
                borderColor: day.date === today ? "primary.main" : undefined,
              }}
            >
              <Stack direction="row" sx={{ alignItems: "baseline", gap: 1, mb: 1.5 }}>
                <Typography variant="subtitle2" component="h3">
                  {weekday}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", flex: 1 }}>
                  {date}
                </Typography>
                {day.date === today && <Chip size="small" color="primary" label="Today" />}
              </Stack>

              {day.slots.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.disabled" }}>
                  {emptyLabel(day, today)}
                </Typography>
              ) : (
                <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.75 }}>
                  {day.slots.map((slot) => (
                    <Tooltip
                      key={slot.start}
                      title={slot.providerIds.map((id) => providerNames.get(id) ?? id).join(", ")}
                    >
                      <Chip size="small" variant="outlined" label={slot.label} sx={Styled.Mono} />
                    </Tooltip>
                  ))}
                </Stack>
              )}
            </Card>
          );
        })}
      </Box>
    </Stack>
  );
}
