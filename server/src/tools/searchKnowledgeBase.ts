import { z } from "zod";
import type { KnowledgeBase, SearchResult } from "../knowledgeBase/search.ts";
import { ToolError, type ToolHandler } from "../vapi/tools.ts";

export const SEARCH_KNOWLEDGE_BASE = "search_knowledge_base";

export const searchKnowledgeBaseDefinition = {
  type: "function",
  function: {
    name: SEARCH_KNOWLEDGE_BASE,
    description:
      "Search the clinic's knowledge base: services, prices, visit length, opening hours, address and parking, dentists, insurance, payment, policies (cancellation, late arrival), first visits, children, emergencies. Call it before answering any question about the clinic; never answer such questions from memory.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The caller's question in a few words, in English, e.g. 'price of a cleaning' or 'do you take Delta Dental'.",
        },
      },
      required: ["query"],
    },
  },
} as const;

const argsSchema = z.object({
  query: z.string().trim().min(1).max(300),
});

export const NOT_FOUND_INSTRUCTION =
  "This is not in the clinic's knowledge base. Don't guess. Tell the caller you don't have that information and offer to transfer them to the front desk.";

export type SearchToolResult =
  | {
      found: true;
      answers: { topic: string; answer: string; serviceId?: string }[];
    }
  | { found: false; instruction: string };

export function toToolResult(result: SearchResult): SearchToolResult {
  if (!result.found) {
    return { found: false, instruction: NOT_FOUND_INSTRUCTION };
  }

  return {
    found: true,
    answers: result.hits.map(({ entry }) => ({
      topic: entry.title,
      answer: entry.content,
      ...(entry.serviceId ? { serviceId: entry.serviceId } : {}),
    })),
  };
}

export function searchKnowledgeBase(knowledgeBase: KnowledgeBase): ToolHandler {
  return async (args, { log }) => {
    const parsed = argsSchema.safeParse(args);

    if (!parsed.success) {
      throw new ToolError('Pass the question as "query", a short string.');
    }

    const result = knowledgeBase.search(parsed.data.query);
    log.info(
      {
        query: parsed.data.query,
        found: result.found,
        hits: result.hits.map((h) => `${h.entry.id}:${h.score}`),
      },
      "knowledge base search",
    );

    return toToolResult(result);
  };
}
