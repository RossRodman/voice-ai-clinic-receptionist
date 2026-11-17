import { Stack, Typography } from "@mui/material";

import { Styled } from "@/styled";

import { AskQuestion, ClinicDetails, FaqList, ServicesTable } from "../../components";

export function KnowledgeBasePage() {
  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <Stack spacing={2}>
        <Typography variant="overline" sx={Styled.Eyebrow}>
          Knowledge base
        </Typography>
        <Typography variant="h1">What the receptionist knows.</Typography>
        <Typography sx={Styled.PageLead}>
          Every answer about the clinic comes from here, never from the model's memory. Hours,
          services and prices come from the same file booking uses, so the assistant never quotes a
          visit length the calendar doesn't know.
        </Typography>
      </Stack>

      <AskQuestion />
      <ClinicDetails />
      <ServicesTable />
      <FaqList />
    </Stack>
  );
}
