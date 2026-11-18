import type { EndOfCallReport, HistoryMessage } from "../vapi/schemas.ts";
import type { CallOutcome, CallUpdate, ToolCallUpdate, TranscriptTurn } from "./types.ts";

export const FORWARDED = "assistant-forwarded-call";

const SPEAKERS: Record<string, TranscriptTurn["role"]> = {
  bot: "assistant",
  assistant: "assistant",
  user: "caller",
};

const iso = (value: string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const time = Date.parse(value);

  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
};

const seconds = (value: number | null | undefined) =>
  value === null || value === undefined ? 0 : Math.round(value * 100) / 100;

function parseArguments(raw: string | Record<string, unknown> | null | undefined) {
  if (!raw) {
    return {};
  }

  if (typeof raw !== "string") {
    return raw;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { value: parsed };
  } catch {
    return { raw };
  }
}

export interface ParsedReport {
  call: CallUpdate;
  toolCalls: ToolCallUpdate[];
}

export function parseReport(report: EndOfCallReport, receivedAt: Date): ParsedReport {
  const { call, artifact } = report;
  const history: HistoryMessage[] = artifact?.messages ?? report.messages ?? [];

  const transcript: TranscriptTurn[] = history.flatMap((m) => {
    const role = SPEAKERS[m.role];
    const text = m.message?.trim();

    return role && text ? [{ role, text, secondsFromStart: seconds(m.secondsFromStart) }] : [];
  });

  const toolCalls: ToolCallUpdate[] = history.flatMap((m) =>
    m.role === "tool_calls"
      ? (m.toolCalls ?? []).map((t) => ({
          id: t.id,
          callId: call.id,
          name: t.function.name,
          arguments: parseArguments(t.function.arguments),
          secondsFromStart: seconds(m.secondsFromStart),
        }))
      : [],
  );

  const endedAt =
    iso(report.endedAt) ?? new Date(report.timestamp ?? receivedAt.getTime()).toISOString();
  let startedAt = iso(report.startedAt) ?? iso(call.startedAt);
  let durationSeconds =
    report.durationSeconds ?? (report.durationMs == null ? undefined : report.durationMs / 1000);

  if (durationSeconds === undefined && startedAt) {
    durationSeconds = (Date.parse(endedAt) - Date.parse(startedAt)) / 1000;
  }

  if (!startedAt && durationSeconds !== undefined) {
    startedAt = new Date(Date.parse(endedAt) - durationSeconds * 1000).toISOString();
  }

  const summary = report.analysis?.summary ?? report.summary;
  const recordingUrl =
    artifact?.recordingUrl ??
    artifact?.recording?.mono?.combinedUrl ??
    artifact?.recording?.url ??
    report.recordingUrl;

  return {
    call: {
      id: call.id,
      status: "ended",
      ...(call.type ? { type: call.type } : {}),
      ...(call.customer?.number ? { customerNumber: call.customer.number } : {}),
      ...(startedAt ? { startedAt } : {}),
      endedAt,
      ...(durationSeconds === undefined
        ? {}
        : { durationSeconds: Math.max(0, Math.round(durationSeconds)) }),
      endedReason: report.endedReason ?? null,
      summary: summary?.trim() || null,
      transcript,
      recordingUrl: recordingUrl ?? null,
      cost: report.cost ?? null,
    },
    toolCalls,
  };
}

export interface OutcomeFacts {
  endedReason: string | null | undefined;
  booked: boolean;
  transcript: TranscriptTurn[];
  toolNames: string[];
}

export function callOutcome({ endedReason, booked, transcript, toolNames }: OutcomeFacts) {
  let outcome: CallOutcome;

  if (booked) {
    outcome = "booked";
  } else if (endedReason === FORWARDED) {
    outcome = "transferred";
  } else if (/error|failed|fault/i.test(endedReason ?? "")) {
    outcome = "failed";
  } else if (toolNames.includes("transferCall")) {
    outcome = "transferred";
  } else if (!transcript.some((t) => t.role === "caller")) {
    outcome = "hung-up";
  } else {
    outcome = "answered";
  }

  return outcome;
}
