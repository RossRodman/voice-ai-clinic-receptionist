import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Box, Button, Grid, Stack, Typography } from "@mui/material";
import { Link, useParams } from "react-router";

import { QueryState } from "@/components";
import { useCall } from "@/hooks/useCalls";
import { useClinic } from "@/hooks/useClinic";
import { Styled } from "@/styled";
import type { CallDetail } from "@/types";

import { CallFacts, Conversation, OutcomeChip } from "../../components";
import { caller, callTime, clock } from "../../format";

function Call({ call, timeZone }: { call: CallDetail; timeZone?: string }) {
  return (
    <Stack spacing={{ xs: 4, md: 5 }}>
      <Stack spacing={1.5}>
        <Typography variant="h1" sx={[Styled.Mono, { fontSize: { xs: "1.75rem", sm: "2.25rem" } }]}>
          {caller(call.customerNumber, call.type)}
        </Typography>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
        >
          <OutcomeChip status={call.status} outcome={call.outcome} />
          <Typography sx={{ color: "text.secondary" }}>
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
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }} component="section" aria-labelledby="conversation-title">
          <Typography id="conversation-title" variant="h3" component="h2" sx={{ mb: 2 }}>
            Conversation
          </Typography>
          <Conversation call={call} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} sx={{ order: { xs: -1, md: 0 } }}>
          <CallFacts call={call} {...(timeZone ? { timeZone } : {})} />
        </Grid>
      </Grid>
    </Stack>
  );
}

export function CallPage() {
  const { callId = "" } = useParams();
  const call = useCall(callId);
  const timeZone = useClinic().data?.timezone;

  return (
    <Stack spacing={3}>
      <Box>
        <Button component={Link} to="/calls" startIcon={<ArrowBackRounded />} sx={{ ml: -1 }}>
          All calls
        </Button>
      </Box>
      <QueryState query={call} rows={5}>
        {(data) => <Call call={data.call} {...(timeZone ? { timeZone } : {})} />}
      </QueryState>
    </Stack>
  );
}
