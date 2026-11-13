import GraphicEqRounded from "@mui/icons-material/GraphicEqRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { Card, CardActionArea, Stack, Typography } from "@mui/material";

import { VAPI_DASHBOARD_URL } from "@/constants";

export function VapiLink() {
  return (
    <Card>
      <CardActionArea href={VAPI_DASHBOARD_URL} target="_blank" rel="noreferrer" sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <GraphicEqRounded fontSize="small" color="primary" />
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Open Vapi
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: "text.secondary" }}>
              Assistant and phone number
            </Typography>
          </Stack>
          <OpenInNewRounded sx={{ fontSize: 16, color: "text.secondary" }} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}
