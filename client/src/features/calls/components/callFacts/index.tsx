import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import { Box, Button, Card, Chip, Divider, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { Styled } from "@/styled";
import type { BookingRecord, CallDetail } from "@/types";

import { appointmentTime } from "../../format";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const id = `call-${title.toLowerCase().replace(/\W+/g, "-")}`;

  return (
    <Card component="section" aria-labelledby={id} sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Typography id={id} variant="h4" component="h2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Card>
  );
}

function Booking({ booking, timeZone }: { booking: BookingRecord; timeZone?: string }) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <EventAvailableOutlined fontSize="small" sx={{ color: "success.main" }} />
        <Typography sx={{ fontWeight: 600 }}>{booking.service}</Typography>
      </Stack>
      <Typography variant="body2">{appointmentTime(booking.startsAt, timeZone)}</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        with {booking.provider}
      </Typography>
      <Typography variant="body2" sx={{ pt: 1 }}>
        {booking.patientName}
        {booking.newPatient && <Chip size="small" label="New" color="secondary" sx={{ ml: 1 }} />}
      </Typography>
      <Typography variant="caption" sx={[Styled.Mono, { color: "text.secondary" }]}>
        {booking.patientPhone}
      </Typography>
      {booking.notes && (
        <Typography variant="body2" sx={{ color: "text.secondary", pt: 0.5 }}>
          {booking.notes}
        </Typography>
      )}
    </Stack>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.5 }}>
      <Typography variant="body2" sx={{ color: "text.secondary", flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        sx={[
          Styled.Mono,
          {
            fontSize: 13,
            textAlign: "right",
            wordBreak: "break-all",
          },
        ]}
      >
        {children}
      </Typography>
    </Box>
  );
}

interface CallFactsProps {
  call: CallDetail;
  timeZone?: string;
}

export function CallFacts({ call, timeZone }: CallFactsProps) {
  return (
    <Stack spacing={2}>
      {call.summary && (
        <Panel title="Summary">
          <Typography variant="body2" sx={{ textWrap: "pretty" }}>
            {call.summary}
          </Typography>
        </Panel>
      )}

      {call.bookings.length > 0 && (
        <Panel title={call.bookings.length > 1 ? "Appointments booked" : "Appointment booked"}>
          <Stack spacing={2} divider={<Divider flexItem />}>
            {call.bookings.map((b) => (
              <Booking key={b.id} booking={b} timeZone={timeZone} />
            ))}
          </Stack>
          <Button component={Link} to="/schedule" size="small" sx={{ mt: 1.5, ml: -1 }}>
            Open the schedule
          </Button>
        </Panel>
      )}

      {call.recordingUrl && (
        <Panel title="Recording">
          <Box
            component="audio"
            controls
            preload="none"
            src={call.recordingUrl}
            aria-label="Call recording"
            sx={{ width: "100%" }}
          />
        </Panel>
      )}

      <Panel title="Details">
        <Fact label="Call id">{call.id}</Fact>
        {call.type && <Fact label="Type">{call.type}</Fact>}
        {call.endedReason && <Fact label="Ended">{call.endedReason}</Fact>}
        {call.cost !== null && <Fact label="Cost">${call.cost.toFixed(4)}</Fact>}
        <Fact label="Functions">{call.toolCalls.length}</Fact>
      </Panel>
    </Stack>
  );
}
