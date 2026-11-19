import { Stack } from "@mui/material";

import { CallFlow, HeroSection, Overview } from "../../components";

export function DashboardPage() {
  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <HeroSection />
      <Overview />
      <CallFlow />
    </Stack>
  );
}
