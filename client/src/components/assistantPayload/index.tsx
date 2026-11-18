import CodeRounded from "@mui/icons-material/CodeRounded";
import { Box, Button, Collapse } from "@mui/material";
import { useState } from "react";

import { Styled } from "@/styled";

interface AssistantPayloadProps {
  value: unknown;
}

export function AssistantPayload({ value }: AssistantPayloadProps) {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Button
        size="small"
        startIcon={<CodeRounded />}
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
      >
        {open ? "Hide" : "Show"} what the assistant receives
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box
          component="pre"
          sx={[
            Styled.Mono,
            {
              mt: 1,
              p: 2,
              m: 0,
              borderRadius: 2,
              bgcolor: "action.hover",
              fontSize: 12.5,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            },
          ]}
        >
          {JSON.stringify(value, null, 2)}
        </Box>
      </Collapse>
    </Box>
  );
}
