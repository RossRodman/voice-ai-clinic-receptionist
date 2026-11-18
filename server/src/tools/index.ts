import type { BookingService } from "../booking/service.ts";
import type { Clinic } from "../clinic/schema.ts";
import type { KnowledgeBase } from "../knowledgeBase/search.ts";
import type { ToolRegistry } from "../vapi/tools.ts";
import { BOOK_APPOINTMENT, bookAppointment, bookAppointmentDefinition } from "./bookAppointment.ts";
import {
  CHECK_AVAILABILITY,
  checkAvailability,
  checkAvailabilityDefinition,
} from "./checkAvailability.ts";
import {
  SEARCH_KNOWLEDGE_BASE,
  searchKnowledgeBase,
  searchKnowledgeBaseDefinition,
} from "./searchKnowledgeBase.ts";

export interface ToolDeps {
  knowledgeBase: KnowledgeBase;
  booking: BookingService;
}

export function createTools({ knowledgeBase, booking }: ToolDeps): ToolRegistry {
  return {
    [SEARCH_KNOWLEDGE_BASE]: searchKnowledgeBase(knowledgeBase),
    [CHECK_AVAILABILITY]: checkAvailability(booking),
    [BOOK_APPOINTMENT]: bookAppointment(booking),
  };
}

export function toolDefinitions(clinic: Clinic) {
  return [
    searchKnowledgeBaseDefinition,
    checkAvailabilityDefinition(clinic),
    bookAppointmentDefinition(clinic),
  ] as const;
}
