import { Box, Chip } from "@mui/material";

import type { HealthState } from "@/hooks/useHealth";

const VARIANTS = {
  loading: { color: "text.disabled", label: "Connecting…" },
  online: { color: "success.main", label: "Server online" },
  offline: { color: "error.main", label: "Server offline" },
} as const;

interface StatusPillProps {
  state: HealthState;
}

export function StatusPill({ state }: StatusPillProps) {
  const variant = VARIANTS[state.kind];

  return (
    <Chip
      role="status"
      variant="outlined"
      size="small"
      label={variant.label}
      icon={
        <Box
          aria-hidden
          sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: variant.color }}
        />
      }
      sx={{ color: "text.secondary", "& .MuiChip-icon": { ml: 1.25, mr: -0.25 } }}
    />
  );
}
