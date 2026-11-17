import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

import { QueryState, SectionHeader } from "@/components";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";

export function FaqList() {
  const knowledgeBase = useKnowledgeBase();

  return (
    <Box component="section" aria-labelledby="faq-title">
      <SectionHeader
        id="faq-title"
        title="Everything else it knows"
        description="Policies and common questions, from server/data/faq.md."
      />

      <Box sx={{ mt: 3 }}>
        <QueryState query={knowledgeBase} rows={6}>
          {({ entries }) => (
            <Box>
              {entries
                .filter((entry) => entry.source === "faq")
                .map((entry) => (
                  <Accordion key={entry.id} disableGutters variant="outlined">
                    <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                      <Typography sx={{ fontWeight: 500 }}>{entry.title}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {entry.content}
                      </Typography>
                      {entry.keywords.length > 0 && (
                        <Stack
                          direction="row"
                          useFlexGap
                          sx={{ flexWrap: "wrap", gap: 0.5, mt: 1.5 }}
                        >
                          {entry.keywords.map((keyword) => (
                            <Chip key={keyword} label={keyword} size="small" />
                          ))}
                        </Stack>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
            </Box>
          )}
        </QueryState>
      </Box>
    </Box>
  );
}
