import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import HealthAndSafetyOutlined from "@mui/icons-material/HealthAndSafetyOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { QueryState, SectionHeader } from "@/components";
import { useClinic } from "@/hooks/useClinic";

interface InfoCardProps {
  title: string;
  icon: SvgIconComponent;
  children: ReactNode;
}

function InfoCard({ title, icon: Icon, children }: InfoCardProps) {
  return (
    <Card component="article" aria-label={title} sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
        <Icon fontSize="small" color="primary" />
        <Typography variant="h4" component="h3">
          {title}
        </Typography>
      </Stack>
      {children}
    </Card>
  );
}

export function ClinicDetails() {
  const clinic = useClinic();

  return (
    <Box component="section" aria-labelledby="clinic-title">
      <SectionHeader
        id="clinic-title"
        title="The clinic"
        description="Brightside Dental, a made-up practice. Its details live in server/data/clinic.json."
      />

      <Box sx={{ mt: 3 }}>
        <QueryState query={clinic}>
          {(c) => (
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              }}
            >
              <InfoCard title="Opening hours" icon={AccessTimeRounded}>
                <Stack spacing={1}>
                  {c.hours.map((line) => (
                    <Stack
                      key={line.days}
                      direction="row"
                      spacing={2}
                      sx={{ justifyContent: "space-between" }}
                    >
                      <Typography variant="body2">{line.days}</Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: line.hours === "closed" ? "text.disabled" : "text.secondary",
                          textAlign: "right",
                        }}
                      >
                        {line.hours}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </InfoCard>

              <InfoCard title="Contact" icon={PlaceOutlined}>
                <Stack spacing={0.5}>
                  <Typography variant="body2">{c.address}</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {c.phone}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {c.email}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", pt: 1 }}>
                    Speaks {c.languages.join(" and ")} · {c.timezone}
                  </Typography>
                </Stack>
              </InfoCard>

              <InfoCard title="Insurance" icon={HealthAndSafetyOutlined}>
                <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.75 }}>
                  {c.insurance.inNetwork.map((plan) => (
                    <Chip key={plan} label={plan} size="small" color="primary" variant="outlined" />
                  ))}
                </Stack>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 1.5 }}>
                  Not accepted: {c.insurance.notAccepted.join(", ")}.
                </Typography>
              </InfoCard>
            </Box>
          )}
        </QueryState>
      </Box>
    </Box>
  );
}
