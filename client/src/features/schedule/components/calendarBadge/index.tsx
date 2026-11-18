import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import ScienceOutlined from "@mui/icons-material/ScienceOutlined";
import { Chip, Tooltip } from "@mui/material";

import type { CalendarKind } from "@/types";

const BADGE = {
  google: {
    label: "Google Calendar",
    color: "success",
    icon: <CloudDoneOutlined />,
    hint: "Free times and bookings come from the clinic's Google Calendar.",
  },
  demo: {
    label: "Demo calendar",
    color: "warning",
    icon: <ScienceOutlined />,
    hint: "Google Calendar is not configured, so the server uses a made-up calendar in memory. Bookings are lost when it restarts.",
  },
} as const;

export function CalendarBadge({ kind }: { kind: CalendarKind }) {
  const badge = BADGE[kind];

  return (
    <Tooltip title={badge.hint}>
      <Chip
        size="small"
        variant="outlined"
        color={badge.color}
        icon={badge.icon}
        label={badge.label}
      />
    </Tooltip>
  );
}
