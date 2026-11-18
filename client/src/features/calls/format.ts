import type { CallDetail, ToolCallRecord, TranscriptTurn } from "@/types";

/** 42 → "0:42", 3725 → "1:02:05". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");

  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

const dayKey = (date: Date, timeZone?: string) => date.toLocaleDateString("en-CA", { timeZone });

/** "Today, 9:41 AM", "Yesterday, 4:05 PM" or "Mon, Nov 16, 9:41 AM", in the clinic's time zone. */
export function callTime(iso: string, timeZone?: string, now = new Date()): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  const day = dayKey(date, timeZone);

  if (day === dayKey(now, timeZone)) {
    return `Today, ${time}`;
  }

  if (day === dayKey(new Date(now.getTime() - 86_400_000), timeZone)) {
    return `Yesterday, ${time}`;
  }

  const sameYear = date.getFullYear() === now.getFullYear();

  return date.toLocaleString("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Thursday, November 19 at 8:00 AM" */
export function appointmentTime(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const time = date.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });

  return `${day} at ${time}`;
}

export function caller(number: string | null, type: string | null): string {
  if (number) {
    return number;
  }

  return type === "webCall" ? "Web call" : "Unknown number";
}

export type ConversationItem =
  | { kind: "turn"; at: number; turn: TranscriptTurn }
  | { kind: "tool"; at: number; toolCall: ToolCallRecord };

export function conversation(call: CallDetail): ConversationItem[] {
  const started = Date.parse(call.startedAt);
  const items: ConversationItem[] = [
    ...call.transcript.map((turn) => ({ kind: "turn" as const, at: turn.secondsFromStart, turn })),
    ...call.toolCalls.map((toolCall) => ({
      kind: "tool" as const,
      at: toolCall.secondsFromStart ?? (Date.parse(toolCall.createdAt) - started) / 1000,
      toolCall,
    })),
  ];

  return items.toSorted((a, b) => a.at - b.at);
}
