import CheckRounded from "@mui/icons-material/CheckRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import { Box, Button, Card, Stack, Typography } from "@mui/material";
import { useState } from "react";

import { Styled } from "@/styled";

export function SystemPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {prompt.split(/\s+/).length} words, built from <code>clinic.json</code>
        </Typography>
        <Button
          size="small"
          startIcon={copied ? <CheckRounded /> : <ContentCopyRounded />}
          onClick={() => void copy()}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </Stack>
      <Box
        component="pre"
        tabIndex={0}
        aria-label="Prompt text"
        sx={[
          Styled.Mono,
          {
            m: 0,
            p: 2,
            maxHeight: 520,
            overflow: "auto",
            borderRadius: 2,
            bgcolor: "action.hover",
            fontSize: 12.5,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          },
        ]}
      >
        {prompt}
      </Box>
    </Card>
  );
}
