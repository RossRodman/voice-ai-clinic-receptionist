import { Box, Card, Stack, Typography } from "@mui/material";
import { useSearchParams } from "react-router";

import { QueryState, SectionHeader } from "@/components";
import { useClinic } from "@/hooks/useClinic";
import { useSchedule } from "@/hooks/useSchedule";
import { Styled } from "@/styled";
import type { Clinic } from "@/types";

import {
  ANYONE,
  AppointmentsTable,
  AssistantOffer,
  CalendarBadge,
  ScheduleControls,
  WeekGrid,
} from "../../components";
import { addDays } from "../../dates";

const DAYS = 7;

function Schedule({ clinic }: { clinic: Clinic }) {
  const [params, setParams] = useSearchParams();

  const serviceId =
    clinic.services.find((s) => s.id === params.get("service"))?.id ??
      clinic.services[0]!.id;
  const service = clinic.services.find((s) => s.id === serviceId)!;
  const providerId = service.providers.find((p) => p === params.get("with")) ??
    ANYONE;
  const from = params.get("from") ?? undefined;

  const schedule = useSchedule({
    serviceId,
    days: DAYS,
    ...(from ? { from } : {}),
    ...(providerId ? { providerId } : {}),
  });

  /** Changes the choice in the link; an empty value removes it. */
  const update = (
    next: Partial<Record<"service" | "with" | "from", string>>,
  ) => {
    const merged = {
      service: serviceId,
      with: providerId,
      from: from ?? "",
      ...next,
    };
    const kept = Object.entries(merged).filter(([, value]) => value);
    setParams(Object.fromEntries(kept), {
      replace: true,
      preventScrollReset: true,
    });
  };

  const providerNames = new Map(clinic.providers.map((p) => [p.id, p.name]));

  return (
    <>
      <Box component="section" aria-labelledby="free-times-title">
        <SectionHeader
          id="free-times-title"
          title="Free times"
          description={`Every slot the assistant could book: opening hours on a ${clinic.booking.slotMinutes}-minute grid, the visit's length, existing appointments, and ${
            clinic.booking.minNoticeMinutes / 60
          } hours' notice.`}
        />
        <Card sx={{ mt: 3, p: { xs: 2, sm: 3 } }}>
          <Stack spacing={3}>
            <ScheduleControls
              clinic={clinic}
              serviceId={serviceId}
              providerId={providerId}
              onChange={(next) =>
                update({ service: next.serviceId, with: next.providerId })}
            />
            <QueryState query={schedule} rows={4}>
              {(data) => (
                <WeekGrid
                  schedule={data}
                  providerNames={providerNames}
                  isFetching={schedule.isFetching && schedule.isPlaceholderData}
                  onWeek={(direction) => {
                    const next = addDays(
                      data.days[0]?.date ?? data.today,
                      direction * DAYS,
                    );
                    update({ from: next <= data.today ? "" : next });
                  }}
                />
              )}
            </QueryState>
          </Stack>
        </Card>
      </Box>

      <AssistantOffer
        key={`${serviceId}:${providerId}`}
        serviceId={serviceId}
        serviceName={service.name}
        providerId={providerId}
        days={schedule.data?.days ?? []}
      />
    </>
  );
}

export function SchedulePage() {
  const clinic = useClinic();

  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <Stack spacing={2}>
        <Typography variant="overline" sx={Styled.Eyebrow}>
          Schedule
        </Typography>
        <Typography variant="h1">
          Booked while the caller is on the line.
        </Typography>
        <Typography sx={Styled.PageLead}>
          The assistant reads free times from the clinic's calendar and books
          the one the caller picks. The time is checked again right before
          booking, so two callers can't get the same slot.
        </Typography>
        {clinic.data && (
          <Box>
            <CalendarBadge kind={clinic.data.calendar} />
          </Box>
        )}
      </Stack>

      <QueryState query={clinic} rows={4}>
        {(c) => <Schedule clinic={c} />}
      </QueryState>

      <AppointmentsTable />
    </Stack>
  );
}
