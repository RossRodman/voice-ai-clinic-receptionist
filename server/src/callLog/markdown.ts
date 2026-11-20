import type { BookingRow, CallDetail, ToolCallRow } from "./types.ts";

const OUTCOMES: Record<string, string> = {
  booked: "Booked an appointment",
  transferred: "Transferred to the front desk",
  answered: "Answered the caller's questions",
  "hung-up": "The caller hung up",
  failed: "Failed",
};

const TOOL_LABELS: Record<string, string> = {
  search_knowledge_base: "Searched the knowledge base",
  check_availability: "Checked free times",
  book_appointment: "Booked an appointment",
  transferCall: "Transferred the call",
  endCall: "Ended the call",
};

export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));

  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function dateTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** Keeps the last 4 digits: a phone number in a public README is someone's phone number. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  return digits.length > 4 ? `•••-•••-${digits.slice(-4)}` : phone;
}

function json(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  return ["```json", text, "```"].join("\n");
}

function parsed(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toolCall(tool: ToolCallRow, startedAt: string): string {
  const at = tool.secondsFromStart ?? (Date.parse(tool.createdAt) - Date.parse(startedAt)) / 1000;
  const label = TOOL_LABELS[tool.name] ?? `Ran ${tool.name}`;
  const timing = tool.durationMs === null ? "" : `, ${tool.durationMs} ms`;
  const outcome = tool.error
    ? `**Error:** ${tool.error}`
    : ["**Result**", "", json(parsed(tool.result))].join("\n");

  return [
    `<details>`,
    `<summary><code>${clock(at)}</code> ⚙️ ${label} · <code>${tool.name}</code>${timing}</summary>`,
    "",
    "**Arguments**",
    "",
    json(tool.arguments),
    "",
    outcome,
    "",
    `</details>`,
  ].join("\n");
}

function booking(b: BookingRow, timeZone: string): string {
  const lines = [
    `- **${b.service}** with ${b.provider}, ${dateTime(b.startsAt, timeZone)}`,
    `- Patient: ${b.patientName}, ${maskPhone(b.patientPhone)}${b.newPatient ? ", new patient" : ""}`,
  ];

  if (b.notes) {
    lines.push(`- Notes: ${b.notes}`);
  }

  return lines.join("\n");
}

export interface MarkdownOptions {
  /** A downloaded copy of the recording, linked instead of Vapi's URL. */
  recording?: string;
}

export function callMarkdown(
  call: CallDetail,
  timeZone: string,
  options: MarkdownOptions = {},
): string {
  const caller = call.customerNumber
    ? maskPhone(call.customerNumber)
    : call.type === "webCall"
      ? "Web call"
      : "Unknown";
  const rows: [string, string][] = [
    ["Call", `\`${call.id}\``],
    ["Caller", caller],
    ["Started", dateTime(call.startedAt, timeZone)],
    ["Length", call.durationSeconds === null ? "—" : clock(call.durationSeconds)],
    ["Outcome", call.outcome ? (OUTCOMES[call.outcome] ?? call.outcome) : "—"],
    ["Ended because", call.endedReason ? `\`${call.endedReason}\`` : "—"],
  ];

  if (call.cost !== null) {
    rows.push(["Cost", `$${call.cost.toFixed(2)}`]);
  }

  const items = [
    ...call.transcript.map((turn) => ({
      at: turn.secondsFromStart,
      text: `**\`${clock(turn.secondsFromStart)}\` ${turn.role === "caller" ? "Caller" : "Assistant"}:** ${turn.text}`,
    })),
    ...call.toolCalls.map((tool) => ({
      at: tool.secondsFromStart ?? (Date.parse(tool.createdAt) - Date.parse(call.startedAt)) / 1000,
      text: toolCall(tool, call.startedAt),
    })),
  ].toSorted((a, b) => a.at - b.at);

  const sections = [
    `# Call record`,
    ["| | |", "|---|---|", ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join("\n"),
  ];

  if (call.summary) {
    sections.push(`## Summary\n\n${call.summary}`);
  }

  if (call.bookings.length > 0) {
    sections.push(
      `## Appointment booked\n\n${call.bookings.map((b) => booking(b, timeZone)).join("\n\n")}`,
    );
  }

  const recording = options.recording ?? call.recordingUrl;

  if (recording) {
    sections.push(`## Recording\n\n[Listen to the call](${recording})`);
  }

  sections.push(
    `## Conversation\n\nThe functions the assistant ran sit where they happened; open one to see what it sent and got back.\n\n${items.map((i) => i.text).join("\n\n")}`,
  );

  return `${sections.join("\n\n")}\n`;
}
