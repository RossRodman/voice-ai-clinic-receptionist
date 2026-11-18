import { Chip, type ChipProps } from "@mui/material";

import type { CallOutcome, CallStatus } from "@/types";

const OUTCOMES: Record<CallOutcome, { label: string; color: ChipProps["color"]; hint: string }> = {
  booked: { label: "Booked", color: "success", hint: "An appointment was booked" },
  transferred: { label: "Transferred", color: "info", hint: "Put through to the front desk" },
  answered: { label: "Answered", color: "primary", hint: "The caller got answers" },
  "hung-up": { label: "Hung up", color: "default", hint: "The caller said nothing" },
  failed: { label: "Failed", color: "error", hint: "The call ended with an error" },
};

interface OutcomeChipProps {
  status: CallStatus;
  outcome: CallOutcome | null;
}

export function OutcomeChip({ status, outcome }: OutcomeChipProps) {
  if (status === "in-progress") {
    return (
      <Chip
        size="small"
        color="warning"
        label="Live"
        title="The call is on"
        sx={{
          "& .MuiChip-label::before": {
            content: '""',
            display: "inline-block",
            width: 6,
            height: 6,
            mr: 0.75,
            mb: "1px",
            borderRadius: "50%",
            bgcolor: "currentColor",
            animation: "pulse 1.6s ease-in-out infinite",
          },
          "@keyframes pulse": { "50%": { opacity: 0.3 } },
          "@media (prefers-reduced-motion: reduce)": {
            "& .MuiChip-label::before": { animation: "none" },
          },
        }}
      />
    );
  }

  const o = outcome ? OUTCOMES[outcome] : undefined;

  return (
    <Chip
      size="small"
      variant="outlined"
      color={o?.color ?? "default"}
      label={o?.label ?? "Ended"}
      title={o?.hint}
    />
  );
}
