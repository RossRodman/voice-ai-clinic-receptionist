import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { Box, Card, List, ListItemButton, Typography } from "@mui/material";
import { Link } from "react-router";

import { filtersToParams, OUTCOME_FILTERS } from "@/features/calls/filters";
import { Styled } from "@/styled";
import type { CallStats } from "@/types";

import { percent } from "../../format";

export function OutcomeBreakdown({ stats }: { stats: CallStats }) {
  const rows = OUTCOME_FILTERS.filter((o) => o.value !== "in-progress" || stats.outcomes[o.value]);
  const total = stats.totals.calls;

  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography id="outcomes-title" sx={{ fontWeight: 600 }}>
        How calls ended
      </Typography>

      <List disablePadding aria-labelledby="outcomes-title" sx={{ mt: 1.5, mx: -1 }}>
        {rows.map(({ value, label }) => {
          const count = stats.outcomes[value];
          const share = total > 0 ? count / total : 0;
          const params = filtersToParams({ outcome: value, from: stats.from, to: stats.to });

          return (
            <ListItemButton
              key={value}
              component={Link}
              to={`/calls?${params}`}
              aria-label={`${label}: ${count}`}
              sx={{
                px: 1,
                py: 0.75,
                display: "grid",
                gridTemplateColumns: "96px 1fr 64px 20px",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Typography variant="body2">{label}</Typography>
              <Box sx={{ height: 8, borderRadius: 1, bgcolor: "action.hover" }}>
                <Box
                  sx={{
                    height: "100%",
                    width: `${share * 100}%`,
                    minWidth: count > 0 ? 4 : 0,
                    borderRadius: 1,
                    bgcolor: "primary.main",
                  }}
                />
              </Box>
              <Typography variant="body2" sx={[Styled.Mono, { textAlign: "right" }]}>
                {count}
                <Box component="span" sx={{ color: "text.secondary", ml: 0.75, fontSize: 12 }}>
                  {total > 0 ? percent(share) : ""}
                </Box>
              </Typography>
              <ChevronRightRounded fontSize="small" sx={{ color: "text.disabled" }} />
            </ListItemButton>
          );
        })}
      </List>
    </Card>
  );
}
