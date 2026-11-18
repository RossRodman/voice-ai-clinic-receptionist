import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { QueryState, SectionHeader } from "@/components";
import { useClinic } from "@/hooks/useClinic";
import { Styled } from "@/styled";

export function ServicesTable() {
  const clinic = useClinic();

  return (
    <Box component="section" aria-labelledby="services-title">
      <SectionHeader
        id="services-title"
        title="Services"
        description="What can be booked, how long the visit takes and what it costs."
      />

      <Box sx={{ mt: 3 }}>
        <QueryState query={clinic} rows={5}>
          {(c) => {
            const providerName = new Map(c.providers.map((p) => [p.id, p.name]));

            return (
              <TableContainer component={Card}>
                <Table aria-labelledby="services-title" sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell align="right">Length</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>With</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {c.services.map((s) => (
                      <TableRow key={s.id} sx={{ "&:last-child td": { border: 0 } }}>
                        <TableCell sx={{ maxWidth: 360 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {s.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {s.description}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={[Styled.Mono, { whiteSpace: "nowrap" }]}>
                          {s.durationMinutes} min
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{s.price}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {s.providers.map((id) => providerName.get(id) ?? id).join(", ")}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          }}
        </QueryState>
      </Box>
    </Box>
  );
}
