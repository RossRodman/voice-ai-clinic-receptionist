import { MenuItem, Stack, TextField } from "@mui/material";

import type { Clinic } from "@/types";

export const ANYONE = "";

interface ScheduleControlsProps {
  clinic: Clinic;
  serviceId: string;
  providerId: string;
  onChange: (next: { serviceId: string; providerId: string }) => void;
}

export function ScheduleControls({
  clinic,
  serviceId,
  providerId,
  onChange,
}: ScheduleControlsProps) {
  const service = clinic.services.find((s) => s.id === serviceId);
  const providers = clinic.providers.filter((p) => service?.providers.includes(p.id));

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <TextField
        select
        size="small"
        label="Service"
        value={serviceId}
        onChange={(event) => {
          const next = clinic.services.find((s) => s.id === event.target.value);
          const keep = next?.providers.includes(providerId) ? providerId : ANYONE;
          onChange({ serviceId: event.target.value, providerId: keep });
        }}
        sx={{ minWidth: 280 }}
      >
        {clinic.services.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name} · {s.durationMinutes} min
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="With"
        slotProps={{
          select: { displayEmpty: true },
          inputLabel: { shrink: true },
        }}
        value={providerId}
        onChange={(event) => onChange({ serviceId, providerId: event.target.value })}
        sx={{ minWidth: 220 }}
      >
        <MenuItem value={ANYONE}>Anyone</MenuItem>
        {providers.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.name}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
