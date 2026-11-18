import { Box, Grid, Stack, Typography } from "@mui/material";

import { AssistantPayload, QueryState, SectionHeader } from "@/components";
import { useAssistant } from "@/hooks/useAssistant";
import { Styled } from "@/styled";
import type { AssistantOverview } from "@/types";

import { FunctionList, SetupChecklist, SystemPrompt, VoiceFacts } from "../../components";

function Overview({ assistant, setup }: AssistantOverview) {
  const prompt = assistant.model.messages.find((m) => m.role === "system")?.content ?? "";

  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <Box component="section" aria-labelledby="setup-title">
        <SectionHeader
          id="setup-title"
          title="Setup"
          description="What the server needs to put this assistant on a phone number."
        />
        <Box sx={{ mt: 3 }}>
          <SetupChecklist setup={setup} />
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }} component="section" aria-labelledby="prompt-title">
          <SectionHeader
            id="prompt-title"
            title="System prompt"
            description="How the assistant speaks, books and decides to hand over."
          />
          <Box sx={{ mt: 3 }}>
            <SystemPrompt prompt={prompt} />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }} component="section" aria-labelledby="voice-title">
          <SectionHeader
            id="voice-title"
            title="Voice and model"
            description="What callers hear, and what does the thinking."
          />
          <Box sx={{ mt: 3 }}>
            <VoiceFacts assistant={assistant} />
          </Box>
        </Grid>
      </Grid>

      <Box component="section" aria-labelledby="functions-title">
        <SectionHeader
          id="functions-title"
          title="Functions"
          description="What the assistant can do during a call, exactly as the model sees it."
        />
        <Box sx={{ mt: 3 }}>
          <FunctionList tools={assistant.model.tools} />
        </Box>
        <Box sx={{ mt: 2 }}>
          <AssistantPayload value={assistant} label="the assistant as sent to Vapi" />
        </Box>
      </Box>
    </Stack>
  );
}

export function AssistantPage() {
  const overview = useAssistant();

  return (
    <Stack spacing={{ xs: 5, md: 7 }}>
      <Stack spacing={2}>
        <Typography variant="overline" sx={Styled.Eyebrow}>
          Assistant
        </Typography>
        <Typography variant="h1">The voice that answers the phone.</Typography>
        <Typography sx={Styled.PageLead}>
          What the assistant is told, how it sounds and the functions it can run. It's built from
          the clinic's details and pushed to Vapi with one command, so the prompt never drifts from
          the knowledge base and the calendar.
        </Typography>
      </Stack>

      <QueryState query={overview} rows={5}>
        {(data) => <Overview {...data} />}
      </QueryState>
    </Stack>
  );
}
