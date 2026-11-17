import type { ClinicData } from "../knowledgeBase/load.ts";
import type { ToolRegistry } from "../vapi/tools.ts";
import {
  SEARCH_KNOWLEDGE_BASE,
  searchKnowledgeBase,
  searchKnowledgeBaseDefinition,
} from "./searchKnowledgeBase.ts";

export function createTools({ knowledgeBase }: ClinicData): ToolRegistry {
  return {
    [SEARCH_KNOWLEDGE_BASE]: searchKnowledgeBase(knowledgeBase),
  };
}

export const toolDefinitions = [searchKnowledgeBaseDefinition];
