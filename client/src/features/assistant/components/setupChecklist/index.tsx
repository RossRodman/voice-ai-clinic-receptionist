import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRounded from "@mui/icons-material/RadioButtonUncheckedRounded";
import { Box, Card, Link, List, ListItem, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { VAPI_DASHBOARD_URL } from "@/constants";
import { Styled } from "@/styled";
import type { AssistantSetup } from "@/types";

interface Step {
  label: string;
  done: boolean;
  detail: ReactNode;
}

const Code = ({ children }: { children: ReactNode }) => (
  <Box component="code" sx={[Styled.Mono, { fontSize: "0.9em" }]}>
    {children}
  </Box>
);

function steps(setup: AssistantSetup): Step[] {
  return [
    {
      label: "Public URL",
      done: setup.webhookUrl !== null,
      detail: setup.webhookUrl ? (
        <Code>{setup.webhookUrl}</Code>
      ) : (
        <>
          Set <Code>PUBLIC_URL</Code> to an https address Vapi can reach, like an ngrok tunnel to
          this server.
        </>
      ),
    },
    {
      label: "Vapi API key",
      done: setup.apiKey,
      detail: setup.apiKey ? (
        "Set. It stays on the server."
      ) : (
        <>
          Set <Code>VAPI_API_KEY</Code> to a private key from the Vapi dashboard.
        </>
      ),
    },
    {
      label: "Transfer number",
      done: setup.transferNumber !== null,
      detail: setup.transferNumber ? (
        <Code>{setup.transferNumber}</Code>
      ) : (
        <>
          Optional. Without <Code>TRANSFER_NUMBER</Code> the assistant gives out the clinic's number
          instead of putting callers through.
        </>
      ),
    },
    {
      label: "Assistant in Vapi",
      done: setup.assistantId !== null,
      detail: setup.assistantId ? (
        <Link
          href={`${VAPI_DASHBOARD_URL}/assistants/${setup.assistantId}`}
          target="_blank"
          rel="noreferrer"
          sx={Styled.Mono}
        >
          {setup.assistantId}
        </Link>
      ) : (
        <>
          Run <Code>npm run assistant:sync</Code>, then set <Code>VAPI_ASSISTANT_ID</Code> to the id
          it prints.
        </>
      ),
    },
    {
      label: "Phone number",
      done: setup.phoneNumberId !== null,
      detail: setup.phoneNumberId ? (
        "Points to this assistant after every sync."
      ) : (
        <>
          Pick the assistant in Vapi under Phone Numbers, or set <Code>VAPI_PHONE_NUMBER_ID</Code>{" "}
          and sync again.
        </>
      ),
    },
  ];
}

export function SetupChecklist({ setup }: { setup: AssistantSetup }) {
  const list = steps(setup);
  const done = list.filter((step) => step.done).length;

  return (
    <Card>
      <List disablePadding aria-label="Setup">
        {list.map((step, i) => (
          <ListItem
            key={step.label}
            divider={i < list.length - 1}
            sx={{ px: { xs: 2, sm: 3 }, py: 1.75, alignItems: "flex-start", gap: 1.5 }}
          >
            {step.done ? (
              <CheckCircleRounded sx={{ color: "success.main", mt: 0.25 }} titleAccess="Done" />
            ) : (
              <RadioButtonUncheckedRounded
                sx={{ color: "text.disabled", mt: 0.25 }}
                titleAccess="To do"
              />
            )}
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600 }}>{step.label}</Typography>
              <Typography
                variant="body2"
                component="div"
                sx={{ color: "text.secondary", overflowWrap: "anywhere" }}
              >
                {step.detail}
              </Typography>
            </Stack>
          </ListItem>
        ))}
      </List>
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.5, bgcolor: "action.hover" }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {done} of {list.length} done. After changing <Code>clinic.json</Code> or <Code>.env</Code>
          , run <Code>npm run assistant:sync</Code> in <Code>server/</Code> to update the assistant
          in Vapi.
        </Typography>
      </Box>
    </Card>
  );
}
