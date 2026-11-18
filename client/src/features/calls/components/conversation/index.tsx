import CallSplitRounded from "@mui/icons-material/CallSplitRounded";
import CodeRounded from "@mui/icons-material/CodeRounded";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import EventNoteOutlined from "@mui/icons-material/EventNoteOutlined";
import FunctionsRounded from "@mui/icons-material/FunctionsRounded";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import {
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  Stack,
  Typography,
} from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { useState } from "react";

import { Styled } from "@/styled";
import type { CallDetail, ToolCallRecord, TranscriptTurn } from "@/types";

import { clock, conversation, toolLabel } from "../../format";

const TOOL_ICONS: Record<string, SvgIconComponent> = {
  search_knowledge_base: MenuBookOutlined,
  check_availability: EventNoteOutlined,
  book_appointment: EventAvailableOutlined,
  transferCall: CallSplitRounded,
};

const payloadSx = [
  Styled.Mono,
  {
    p: 1.5,
    m: 0,
    borderRadius: 2,
    bgcolor: "action.hover",
    fontSize: 12.5,
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
] as const;

function Turn({ turn }: { turn: TranscriptTurn }) {
  const isCaller = turn.role === "caller";
  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        justifyContent: isCaller ? "flex-end" : "flex-start",
      }}
    >
      <Box sx={{ maxWidth: { xs: "88%", sm: "75%" } }}>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "text.secondary",
            textAlign: isCaller ? "right" : "left",
            mb: 0.5,
          }}
        >
          {isCaller ? "Caller" : "Assistant"} ·{" "}
          <Box component="span" sx={Styled.Mono}>
            {clock(turn.secondsFromStart)}
          </Box>
        </Typography>
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderRadius: 3,
            ...(isCaller
              ? { bgcolor: "action.selected", borderTopRightRadius: 4 }
              : { bgcolor: "action.hover", borderTopLeftRadius: 4 }),
          }}
        >
          <Typography variant="body2" sx={{ textWrap: "pretty" }}>
            {turn.text}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function ToolCall({ toolCall, at }: { toolCall: ToolCallRecord; at: number }) {
  const [open, setOpen] = useState(false);
  const Icon = TOOL_ICONS[toolCall.name] ?? FunctionsRounded;
  const ranHere = toolCall.durationMs !== null;

  return (
    <Box component="li" aria-label={toolLabel(toolCall.name)}>
      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderStyle: "dashed",
          borderRadius: 2,
          px: 2,
          py: 1,
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}
        >
          <Icon
            fontSize="small"
            sx={{ color: toolCall.error ? "error.main" : "primary.main" }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {toolLabel(toolCall.name)}
          </Typography>
          <Typography
            variant="caption"
            sx={[Styled.Mono, { color: "text.secondary" }]}
          >
            {toolCall.name} · {clock(at)}
            {ranHere && ` · ${toolCall.durationMs} ms`}
          </Typography>
          {toolCall.error && (
            <Chip size="small" color="error" variant="outlined" label="Error" />
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={<CodeRounded />}
            onClick={() => setOpen((isOpen) => !isOpen)}
            aria-expanded={open}
          >
            {open ? "Hide" : "Details"}
          </Button>
        </Stack>
        <Collapse in={open} unmountOnExit>
          <Stack spacing={1.5} sx={{ mt: 1, mb: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Arguments
              </Typography>
              <Box component="pre" sx={payloadSx}>
                {JSON.stringify(toolCall.arguments, null, 2)}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {toolCall.error
                  ? "Error the assistant got"
                  : "What the assistant got back"}
              </Typography>
              <Box component="pre" sx={payloadSx}>
                {toolCall.error ??
                  (ranHere
                    ? JSON.stringify(toolCall.result, null, 2)
                    : "Run by Vapi, not by this server.")}
              </Box>
            </Box>
          </Stack>
        </Collapse>
      </Box>
    </Box>
  );
}

export function Conversation({ call }: { call: CallDetail }) {
  const items = conversation(call);

  if (items.length === 0) {
    return (
      <Card sx={{ p: 3 }}>
        <Typography sx={{ color: "text.secondary" }}>
          {call.status === "in-progress"
            ? "The call is on. The transcript arrives with the end-of-call report; functions show up as the assistant runs them."
            : "Nothing was said on this call."}
        </Typography>
      </Card>
    );
  }

  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack
        component="ol"
        aria-label="Conversation"
        spacing={2}
        sx={{ listStyle: "none", m: 0, p: 0 }}
      >
        {items.map((item, i) =>
          item.kind === "turn"
            ? <Turn key={`turn-${i}`} turn={item.turn} />
            : (
              <ToolCall
                key={item.toolCall.id}
                toolCall={item.toolCall}
                at={item.at}
              />
            )
        )}
      </Stack>
    </Card>
  );
}
