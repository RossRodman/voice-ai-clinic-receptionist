import SearchRounded from "@mui/icons-material/SearchRounded";
import { Box, Button, Card, Chip, Stack, TextField } from "@mui/material";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";

import { SectionHeader } from "@/components";
import { useKnowledgeSearch } from "@/hooks/useKnowledgeBase";

import { SearchResult } from "../searchResult";

import { EXAMPLE_QUESTIONS } from "./examples";

export function AskQuestion() {
  const [params, setParams] = useSearchParams();
  const question = params.get("q")?.trim() ?? "";
  const [draft, setDraft] = useState(question);
  const search = useKnowledgeSearch(question);

  const ask = (text: string) => {
    setDraft(text);
    setParams(text.trim() ? { q: text.trim() } : {}, { replace: true, preventScrollReset: true });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
  };

  return (
    <Box component="section" aria-labelledby="ask-title">
      <SectionHeader
        id="ask-title"
        title="Ask like a caller"
        description="The same search the assistant runs during a call, with what it gets back."
      />

      <Card sx={{ mt: 3, p: { xs: 2, sm: 3 } }}>
        <Stack component="form" direction="row" spacing={1} onSubmit={onSubmit}>
          <TextField
            fullWidth
            size="small"
            label="Question"
            placeholder="Do you see kids?"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 300 } }}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<SearchRounded />}
            disabled={!draft.trim()}
            loading={search.isFetching}
          >
            Ask
          </Button>
        </Stack>

        <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1, mt: 2 }}>
          {EXAMPLE_QUESTIONS.map((example) => (
            <Chip
              key={example}
              label={example}
              variant="outlined"
              size="small"
              onClick={() => ask(example)}
            />
          ))}
        </Stack>

        {question && <SearchResult query={search} />}
      </Card>
    </Box>
  );
}
