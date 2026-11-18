import FormatQuoteRounded from "@mui/icons-material/FormatQuoteRounded";
import { Box, Card, Divider, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { Styled } from "@/styled";
import type { VapiAssistant } from "@/types";

function Quote({ label, text }: { label: string; text: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
        <FormatQuoteRounded fontSize="small" sx={{ color: "primary.main", mt: 0.25 }} />
        <Typography sx={{ textWrap: "pretty" }}>{text}</Typography>
      </Stack>
    </Box>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.5 }}>
      <Typography variant="body2" sx={{ color: "text.secondary", flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={[
          Styled.Mono,
          { fontSize: 13, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" },
        ]}
      >
        {children}
      </Typography>
    </Box>
  );
}

export function VoiceFacts({ assistant }: { assistant: VapiAssistant }) {
  const { model, voice, transcriber } = assistant;

  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={2}>
        <Quote label="Answers the phone with" text={assistant.firstMessage} />
        <Quote label="Says goodbye with" text={assistant.endCallMessage} />
        <Divider />
        <Box>
          <Fact label="Model">
            {model.provider}/{model.model}
          </Fact>
          <Fact label="Temperature">{model.temperature}</Fact>
          <Fact label="Voice">
            {voice.provider} · {voice.voiceId}
          </Fact>
          <Fact label="Speech to text">
            {transcriber.provider} · {transcriber.model}
          </Fact>
          <Fact label="Longest call">{Math.round(assistant.maxDurationSeconds / 60)} min</Fact>
          <Fact label="Hangs up after silence">{assistant.silenceTimeoutSeconds} s</Fact>
        </Box>
        {transcriber.keyterm && transcriber.keyterm.length > 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Words the transcriber listens for: {transcriber.keyterm.join(", ")}.
          </Typography>
        )}
      </Stack>
    </Card>
  );
}
