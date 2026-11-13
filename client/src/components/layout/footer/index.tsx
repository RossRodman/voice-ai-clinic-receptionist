import { Box, Container, Link, Typography } from "@mui/material";

import { REPO_URL } from "@/constants";

export function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: "divider" }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Built with Vapi, Node.js, Google Calendar and Supabase.{" "}
          <Link href={REPO_URL} target="_blank" rel="noreferrer" underline="hover">
            View the source
          </Link>
        </Typography>
      </Container>
    </Box>
  );
}
