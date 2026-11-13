import { Stack } from "@mui/material";

import { HeroSection, CallFlow } from "../../components";

export function DashboardPage() {
  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <HeroSection />
      <CallFlow />
    </Stack>
  );
}
