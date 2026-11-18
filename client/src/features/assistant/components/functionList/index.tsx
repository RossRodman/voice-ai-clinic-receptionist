import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

import { ToolIcon } from "@/components";
import { Styled } from "@/styled";
import type { AssistantTool, FunctionParameter, FunctionTool } from "@/types";

const ENUM_LIMIT = 6;

function toolName(tool: AssistantTool): string {
  return tool.type === "function" ? tool.function.name : tool.type;
}

function Parameter({
  name,
  parameter,
  required,
}: {
  name: string;
  parameter: FunctionParameter;
  required: boolean;
}) {
  const values = parameter.enum ?? [];

  return (
    <Box component="li" sx={{ py: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography sx={[Styled.Mono, { fontSize: 13, fontWeight: 600 }]}>{name}</Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {parameter.type}
          {required ? ", required" : ""}
        </Typography>
      </Stack>
      {parameter.description && (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
          {parameter.description}
        </Typography>
      )}
      {values.length > 0 && values.length <= ENUM_LIMIT && (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
          One of{" "}
          <Box component="span" sx={Styled.Mono}>
            {values.join(", ")}
          </Box>
        </Typography>
      )}
    </Box>
  );
}

function FunctionBody({ tool }: { tool: FunctionTool }) {
  const { description, parameters } = tool.function;
  const required = new Set(parameters.required ?? []);
  const wait = tool.messages?.find((m) => m.type === "request-start")?.content;

  return (
    <>
      <Typography variant="body2" sx={{ textWrap: "pretty" }}>
        {description}
      </Typography>
      {wait && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          While it runs, the assistant says “{wait}”
        </Typography>
      )}
      <Box component="ul" aria-label="Parameters" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {Object.entries(parameters.properties).map(([name, parameter]) => (
          <Parameter key={name} name={name} parameter={parameter} required={required.has(name)} />
        ))}
      </Box>
    </>
  );
}

function body(tool: AssistantTool): ReactNode {
  if (tool.type === "function") {
    return <FunctionBody tool={tool} />;
  }

  if (tool.type === "transferCall") {
    return tool.destinations.map((destination) => (
      <Typography key={destination.number} variant="body2">
        Puts the caller through to {destination.description},{" "}
        <Box component="span" sx={Styled.Mono}>
          {destination.number}
        </Box>
        , after saying “{destination.message}”
      </Typography>
    ));
  }

  return <Typography variant="body2">Hangs up once the caller has said goodbye.</Typography>;
}

export function FunctionList({ tools }: { tools: AssistantTool[] }) {
  return (
    <Stack spacing={2} component="ul" aria-label="Functions" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {tools.map((tool) => {
        const name = toolName(tool);
        const runsHere = tool.type === "function";

        return (
          <Card key={name} component="li" aria-label={name} sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <ToolIcon name={name} fontSize="small" sx={{ color: "primary.main" }} />
                <Typography sx={[Styled.Mono, { fontWeight: 600 }]}>{name}</Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  color={runsHere ? "primary" : "default"}
                  label={runsHere ? "Runs on this server" : "Built into Vapi"}
                />
              </Stack>
              {body(tool)}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
