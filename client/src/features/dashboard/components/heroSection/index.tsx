import { Stack, Typography } from "@mui/material";

import { Styled } from "@/styled";

export function HeroSection() {
  return (
    <Stack spacing={2}>
      <Typography variant="overline" sx={Styled.Eyebrow}>
        Vapi · Node.js · Google Calendar · Supabase
      </Typography>
      <Typography variant="h1">Every call answered.</Typography>
      <Typography sx={Styled.PageLead}>
        Patients call Brightside Dental and talk to an AI receptionist. It answers questions from
        the clinic's knowledge base, finds a free slot and books the visit in Google Calendar while
        the caller is on the line, and hands the call to the front desk when a person is needed.
        Every call lands here with its transcript, recording and outcome.
      </Typography>
    </Stack>
  );
}
