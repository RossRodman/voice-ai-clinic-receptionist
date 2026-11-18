import {
  Alert,
  Box,
  Card,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { AssistantPayload, QueryState, SectionHeader } from "@/components";
import { useAvailability } from "@/hooks/useSchedule";
import type { ScheduleDay, TimeOfDay } from "@/types";

const SOONEST = "";

interface AssistantOfferProps {
  serviceId: string;
  serviceName: string;
  providerId: string;
  days: ScheduleDay[];
}

export function AssistantOffer(
  { serviceId, serviceName, providerId, days }: AssistantOfferProps,
) {
  const [date, setDate] = useState(SOONEST);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("any");
  // A day from another week: back to the soonest times.
  const day = days.some((d) => d.date === date) ? date : SOONEST;

  const availability = useAvailability({
    serviceId,
    ...(day ? { date: day } : {}),
    ...(timeOfDay === "any" ? {} : { timeOfDay }),
    ...(providerId ? { providerId } : {}),
  });

  return (
    <Box component="section" aria-labelledby="offer-title">
      <SectionHeader
        id="offer-title"
        title="What the assistant offers"
        description="check_availability for the same choice: a few times spread across the day, not the whole grid, so the caller can pick by ear."
      />

      <Card sx={{ mt: 3, p: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <TextField
            select
            size="small"
            label="The caller asks for"
            slotProps={{
              select: { displayEmpty: true },
              inputLabel: { shrink: true },
            }}
            value={day}
            onChange={(event) => setDate(event.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value={SOONEST}>The soonest time</MenuItem>
            {days.map((d) => (
              <MenuItem key={d.date} value={d.date}>
                {d.label}
              </MenuItem>
            ))}
          </TextField>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={timeOfDay}
            onChange={(_, value: TimeOfDay | null) =>
              value && setTimeOfDay(value)}
            aria-label="Time of day"
          >
            <ToggleButton value="any">Any time</ToggleButton>
            <ToggleButton value="morning">Morning</ToggleButton>
            <ToggleButton value="afternoon">Afternoon</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <QueryState query={availability} rows={3}>
          {({ toolResult }) => (
            <Stack spacing={2} aria-live="polite">
              {toolResult.note && (
                <Alert severity={toolResult.slots.length ? "info" : "warning"}>
                  {toolResult.note}
                </Alert>
              )}
              {toolResult.slots.length > 0
                ? (
                  <List
                    dense
                    disablePadding
                    aria-label={`Times offered for ${serviceName}`}
                  >
                    {toolResult.slots.map((slot) => (
                      <ListItem key={slot.start} disableGutters>
                        <ListItemText
                          primary={slot.spoken}
                          secondary={`with ${slot.provider}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )
                : (
                  !toolResult.note && (
                    <Alert severity="warning">No free times.</Alert>
                  )
                )}
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontStyle: "italic" }}
              >
                {toolResult.instruction}
              </Typography>
              <AssistantPayload value={toolResult} />
            </Stack>
          )}
        </QueryState>
      </Card>
    </Box>
  );
}
