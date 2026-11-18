const TOOL_LABELS: Record<string, string> = {
  search_knowledge_base: "Searched the knowledge base",
  check_availability: "Checked free times",
  book_appointment: "Booked an appointment",
  transferCall: "Transferred the call",
  endCall: "Ended the call",
};

export const toolLabel = (name: string) => TOOL_LABELS[name] ?? `Ran ${name}`;
