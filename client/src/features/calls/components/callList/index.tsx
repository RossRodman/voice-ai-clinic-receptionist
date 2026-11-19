import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { Box, Button, Card, List, ListItemButton, Stack, Typography } from "@mui/material";
import { Link } from "react-router";

import { Styled } from "@/styled";
import type { CallSummary } from "@/types";

import { caller, callTime, clock } from "../../format";
import { OutcomeChip } from "../outcomeChip";

interface CallListProps {
  calls: CallSummary[];
  timeZone?: string;
  filtered?: boolean;
  onClearFilters?: () => void;
}

export function CallList({ calls, timeZone, filtered, onClearFilters }: CallListProps) {
  if (calls.length === 0 && filtered) {
    return (
      <Card sx={{ p: 3 }}>
        <Typography sx={{ fontWeight: 600 }}>No calls match these filters.</Typography>
        <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
          Try another outcome or a wider date range.
        </Typography>
        {onClearFilters && (
          <Button onClick={onClearFilters} sx={{ mt: 1.5, ml: -1 }}>
            Clear the filters
          </Button>
        )}
      </Card>
    );
  }

  if (calls.length === 0) {
    return (
      <Card sx={{ p: 3 }}>
        <Typography sx={{ fontWeight: 600 }}>No calls yet.</Typography>
        <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
          Calls show up here as soon as the assistant picks up. To try it without a phone, run{" "}
          <Box component="code" sx={Styled.Mono}>
            npm run demo:call
          </Box>{" "}
          in{" "}
          <Box component="code" sx={Styled.Mono}>
            server/
          </Box>
          : it sends three made-up calls through the webhook.
        </Typography>
      </Card>
    );
  }

  return (
    <Card>
      <List disablePadding aria-label="Calls">
        {calls.map((call, i) => (
          <ListItemButton
            key={call.id}
            component={Link}
            to={`/calls/${encodeURIComponent(call.id)}`}
            divider={i < calls.length - 1}
            sx={{
              borderRadius: 0,
              px: { xs: 2, sm: 3 },
              py: 2,
              alignItems: "flex-start",
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}
              >
                <Typography sx={[Styled.Mono, { fontWeight: 600, fontSize: 15 }]}>
                  {caller(call.customerNumber, call.type)}
                </Typography>
                <OutcomeChip status={call.status} outcome={call.outcome} />
              </Stack>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                {callTime(call.startedAt, timeZone)}
                {call.durationSeconds !== null && (
                  <>
                    {" · "}
                    <Box component="span" sx={Styled.Mono}>
                      {clock(call.durationSeconds)}
                    </Box>
                  </>
                )}
              </Typography>
              {call.summary && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {call.summary}
                </Typography>
              )}
            </Box>
            <ChevronRightRounded sx={{ color: "text.disabled", alignSelf: "center" }} />
          </ListItemButton>
        ))}
      </List>
    </Card>
  );
}
