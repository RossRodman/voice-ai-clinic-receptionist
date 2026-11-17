import CodeRounded from "@mui/icons-material/CodeRounded";
import { Alert, Box, Button, Chip, Collapse, Stack, Typography } from "@mui/material";
import type { UseQueryResult } from "@tanstack/react-query";
import { useState } from "react";

import { QueryState } from "@/components";
import { Styled } from "@/styled";
import type { SearchResponse } from "@/types";

const SOURCE_LABEL = { clinic: "Clinic", faq: "FAQ" } as const;

interface SearchResultProps {
  query: UseQueryResult<SearchResponse>;
}

export function SearchResult({ query }: SearchResultProps) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Box sx={{ mt: 3 }} aria-live="polite">
      <QueryState query={query} rows={2}>
        {(result) => (
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Search terms:{" "}
              <Box component="span" sx={Styled.Mono}>
                {result.terms.length ? result.terms.join(" · ") : "none"}
              </Box>
              {" · "}covered {Math.round(result.coverage * 100)}%
            </Typography>

            {result.found ? (
              result.hits.map((hit, index) => (
                <Box
                  key={hit.id}
                  component="article"
                  aria-label={hit.title}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: 1,
                    borderColor: index === 0 ? "primary.main" : "divider",
                  }}
                >
                  <Stack
                    direction="row"
                    useFlexGap
                    sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
                  >
                    <Typography variant="h4" component="h3" sx={{ flex: 1, minWidth: 160 }}>
                      {hit.title}
                    </Typography>
                    {hit.serviceId && <Chip size="small" label={hit.serviceId} sx={Styled.Mono} />}
                    <Chip size="small" variant="outlined" label={SOURCE_LABEL[hit.source]} />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`score ${hit.score.toFixed(1)}`}
                      sx={Styled.Mono}
                    />
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                    {hit.content}
                  </Typography>
                </Box>
              ))
            ) : (
              <Alert severity="info">
                Not in the knowledge base. The assistant says it doesn't have that information and
                offers to transfer the call to the front desk.
              </Alert>
            )}

            <Box>
              <Button
                size="small"
                startIcon={<CodeRounded />}
                onClick={() => setShowRaw((open) => !open)}
                aria-expanded={showRaw}
              >
                {showRaw ? "Hide" : "Show"} what the assistant receives
              </Button>
              <Collapse in={showRaw} unmountOnExit>
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
                  {JSON.stringify(result.toolResult, null, 2)}
                </Box>
              </Collapse>
            </Box>
          </Stack>
        )}
      </QueryState>
    </Box>
  );
}
