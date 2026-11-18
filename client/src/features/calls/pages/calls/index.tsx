import { Box, Stack, Typography } from "@mui/material";

import { QueryState, SectionHeader } from "@/components";
import { useCalls } from "@/hooks/useCalls";
import { useClinic } from "@/hooks/useClinic";
import { Styled } from "@/styled";

import { CallList, CallLogBadge } from "../../components";

export function CallsPage() {
  const calls = useCalls();
  const timeZone = useClinic().data?.timezone;

  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <Stack spacing={2}>
        <Typography variant="overline" sx={Styled.Eyebrow}>
          Calls
        </Typography>
        <Typography variant="h1">Every call, and what came of it.</Typography>
        <Typography sx={Styled.PageLead}>
          Who called, what they asked, what the assistant looked up and booked,
          and how the call ended. Each call is saved as it happens and completed
          by Vapi's end-of-call report.
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
          description="The latest first. A call on the line right now shows as Live."
        />
        <Box sx={{ mt: 3 }}>
          <QueryState query={calls} rows={4}>
            {(data) => (
              <CallList
                calls={data.calls}
                {...(timeZone ? { timeZone } : {})}
              />
            )}
          </QueryState>
        </Box>
      </Box>
    </Stack>
  );
}
