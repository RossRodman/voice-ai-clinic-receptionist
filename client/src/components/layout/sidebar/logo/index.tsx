import PhoneInTalkRounded from "@mui/icons-material/PhoneInTalkRounded";
import { Box, Stack, Typography } from "@mui/material";
import { Link } from "react-router";

export function Logo() {
  return (
    <Stack
      component={Link}
      to="/"
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", color: "inherit", textDecoration: "none" }}
    >
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 36,
          height: 36,
          borderRadius: 2.5,
          color: "primary.contrastText",
          background: "linear-gradient(135deg, #0e7490, #7c3aed)",
        }}
      >
        <PhoneInTalkRounded fontSize="small" />
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 650, lineHeight: 1.2 }}>Front Desk</Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          AI voice receptionist
        </Typography>
      </Box>
    </Stack>
  );
}
