import {
  Box,
  Card,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { QueryState, SectionHeader } from "@/components";
import { useAppointments } from "@/hooks/useSchedule";
import { Styled } from "@/styled";

export function AppointmentsTable() {
  const appointments = useAppointments();

  return (
    <Box component="section" aria-labelledby="appointments-title">
      <SectionHeader
        id="appointments-title"
        title="Booked by the assistant"
        description="Upcoming appointments the assistant created, read back from the calendar."
      />

      <Box sx={{ mt: 3 }}>
        <QueryState query={appointments} rows={2}>
          {({ appointments: rows }) =>
            rows.length === 0 ? (
              <Card sx={{ p: 3 }}>
                <Typography sx={{ color: "text.secondary" }}>
                  Nothing booked yet. Appointments show up here as soon as a caller books one.
                </Typography>
              </Card>
            ) : (
              <TableContainer component={Card}>
                <Table aria-labelledby="appointments-title" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>When</TableCell>
                      <TableCell>Patient</TableCell>
                      <TableCell>Service</TableCell>
                      <TableCell>With</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((a) => (
                      <TableRow key={a.id} sx={{ "&:last-child td": { border: 0 } }}>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {a.spoken}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {a.durationMinutes} min
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {a.patientName}
                            {a.newPatient && (
                              <Chip size="small" label="New" color="secondary" sx={{ ml: 1 }} />
                            )}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={[Styled.Mono, { color: "text.secondary" }]}
                          >
                            {a.patientPhone}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 280 }}>
                          <Typography variant="body2">{a.service}</Typography>
                          {a.notes && (
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {a.notes}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {a.provider}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          }
        </QueryState>
      </Box>
    </Box>
  );
}
