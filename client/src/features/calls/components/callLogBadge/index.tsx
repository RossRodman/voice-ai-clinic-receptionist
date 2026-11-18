import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import ScienceOutlined from "@mui/icons-material/ScienceOutlined";
import { Chip, Tooltip } from "@mui/material";

import type { CallLogKind } from "@/types";

const BADGE = {
  supabase: {
    label: "Supabase",
    color: "success",
    icon: <CloudDoneOutlined />,
    hint: "Calls are stored in the clinic's Supabase database.",
  },
  memory: {
    label: "Call log in memory",
    color: "warning",
    icon: <ScienceOutlined />,
    hint: "Supabase is not configured, so the server keeps calls in memory. They are lost when it restarts.",
  },
} as const;

export function CallLogBadge({ kind }: { kind: CallLogKind }) {
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
