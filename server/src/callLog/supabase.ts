import { z } from "zod";
import {
  type BookingRow,
  type CallDetail,
  type CallQuery,
  type CallRow,
  type CallStat,
  type CallStore,
  CallStoreError,
  type CallSummary,
  type CallUpdate,
  type NewBooking,
  type ToolCallRow,
  type ToolCallUpdate,
} from "./types.ts";

const CALL_COLUMNS = {
  id: "id",
  status: "status",
  type: "type",
  customerNumber: "customer_number",
  startedAt: "started_at",
  endedAt: "ended_at",
  durationSeconds: "duration_seconds",
  endedReason: "ended_reason",
  outcome: "outcome",
  summary: "summary",
  transcript: "transcript",
  recordingUrl: "recording_url",
  cost: "cost",
} as const satisfies Record<keyof CallRow, string>;

const TOOL_CALL_COLUMNS = {
  id: "id",
  callId: "call_id",
  name: "name",
  arguments: "arguments",
  result: "result",
  error: "error",
  durationMs: "duration_ms",
  secondsFromStart: "seconds_from_start",
  createdAt: "created_at",
} as const satisfies Record<keyof ToolCallRow, string>;

const BOOKING_COLUMNS = {
  id: "id",
  callId: "call_id",
  serviceId: "service_id",
  service: "service",
  providerId: "provider_id",
  provider: "provider",
  startsAt: "starts_at",
  endsAt: "ends_at",
  patientName: "patient_name",
  patientPhone: "patient_phone",
  newPatient: "new_patient",
  notes: "notes",
  createdAt: "created_at",
} as const satisfies Record<keyof BookingRow, string>;

type Columns = Record<string, string>;

const SUMMARY_FIELDS = Object.keys(CALL_COLUMNS).filter(
  (f) => !["transcript", "recordingUrl", "cost"].includes(f),
) as (keyof CallSummary)[];

const STAT_FIELDS = ["startedAt", "status", "outcome", "durationSeconds"] as const;

const STATS_PAGE = 1000;

const MAX_STATS_PAGES = 20;

// PostgREST's or=(...) syntax reserves , . : ( ) and quotes, and ilike treats * % _ as wildcards.
export const searchTerm = (search: string) =>
  search
    .replace(/[^\p{L}\p{N} +@'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const NUMERIC = new Set(["cost", "secondsFromStart"]);

function toDb(value: object, columns: Columns): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const [field, v] of Object.entries(value)) {
    const column = columns[field];

    if (column && v !== undefined) {
      row[column] = v;
    }
  }

  return row;
}

function fromDb<T>(row: Record<string, unknown>, columns: Columns, fields?: string[]): T {
  const value: Record<string, unknown> = {};

  for (const field of fields ?? Object.keys(columns)) {
    const v = row[columns[field]!] ?? null;
    value[field] = NUMERIC.has(field) && v !== null ? Number(v) : v;
  }

  return value as T;
}

const rows = z.array(z.record(z.string(), z.unknown()));

export interface SupabaseCallStoreOptions {
  url: string;
  key: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export class SupabaseCallStore implements CallStore {
  readonly kind = "supabase";
  private readonly rest: string;
  private readonly headers: Record<string, string>;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: SupabaseCallStoreOptions) {
    this.rest = `${options.url.replace(/\/+$/, "")}/rest/v1`;
    this.headers = {
      apikey: options.key,
      ...(options.key.startsWith("eyJ") ? { authorization: `Bearer ${options.key}` } : {}),
    };

    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  private async request(
    path: string,
    init: { method?: string; body?: unknown; prefer?: string } = {},
  ): Promise<unknown> {
    let response: Response;

    try {
      response = await this.fetchFn(`${this.rest}${path}`, {
        method: init.method ?? "GET",
        headers: {
          ...this.headers,
          accept: "application/json",
          ...(init.body === undefined ? {} : { "content-type": "application/json" }),
          ...(init.prefer ? { prefer: init.prefer } : {}),
        },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new CallStoreError(`Supabase is unreachable: ${(err as Error).message}`);
    }

    const text = await response.text();
    let body: unknown = null;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {}

    if (!response.ok) {
      const message = z.object({ message: z.string() }).safeParse(body);
      throw new CallStoreError(
        `Supabase ${response.status}: ${
          message.success ? message.data.message : response.statusText
        }`,
        response.status,
      );
    }

    return body;
  }

  private upsert(table: string, body: unknown, onConflict: "merge" | "ignore") {
    return this.request(`/${table}`, {
      method: "POST",
      body,
      prefer: `resolution=${onConflict}-duplicates,return=minimal`,
    });
  }

  async openCall(call: CallUpdate): Promise<void> {
    await this.upsert("calls", toDb(call, CALL_COLUMNS), "ignore");
  }

  async saveCall(call: CallUpdate): Promise<void> {
    await this.upsert("calls", toDb(call, CALL_COLUMNS), "merge");
  }

  async saveToolCalls(toolCalls: ToolCallUpdate[]): Promise<void> {
    if (toolCalls.length === 0) {
      return;
    }

    await this.upsert(
      "tool_calls",
      toolCalls.map((t) => toDb(t, TOOL_CALL_COLUMNS)),
      "merge",
    );
  }

  async saveBooking(booking: NewBooking): Promise<void> {
    await this.upsert("bookings", toDb(booking, BOOKING_COLUMNS), "merge");
  }

  async listCalls(query: CallQuery): Promise<CallSummary[]> {
    const select = SUMMARY_FIELDS.map((f) => CALL_COLUMNS[f]).join(",");
    const params = new URLSearchParams({
      select,
      order: "started_at.desc",
      limit: String(query.limit),
    });

    if (query.outcome === "in-progress") {
      params.append("status", "eq.in-progress");
    } else if (query.outcome) {
      params.append("outcome", `eq.${query.outcome}`);
    }

    if (query.from) {
      params.append("started_at", `gte.${query.from}`);
    }

    if (query.to) {
      params.append("started_at", `lt.${query.to}`);
    }

    const term = query.search ? searchTerm(query.search) : "";

    if (term) {
      params.append("or", `(customer_number.ilike."*${term}*",summary.ilike."*${term}*")`);
    }

    const body = rows.parse(await this.request(`/calls?${params}`));

    return body.map((row) => fromDb<CallSummary>(row, CALL_COLUMNS, SUMMARY_FIELDS));
  }

  async listCallStats(from: string): Promise<CallStat[]> {
    const select = STAT_FIELDS.map((f) => CALL_COLUMNS[f]).join(",");
    const stats: CallStat[] = [];

    for (let page = 0; page < MAX_STATS_PAGES; page++) {
      const params = new URLSearchParams({
        select,
        started_at: `gte.${from}`,
        order: "started_at.asc,id.asc",
        limit: String(STATS_PAGE),
        offset: String(page * STATS_PAGE),
      });
      const body = rows.parse(await this.request(`/calls?${params}`));
      stats.push(...body.map((row) => fromDb<CallStat>(row, CALL_COLUMNS, [...STAT_FIELDS])));

      if (body.length < STATS_PAGE) {
        break;
      }
    }

    return stats;
  }

  async getCall(id: string): Promise<CallDetail | null> {
    const params = new URLSearchParams({
      id: `eq.${id}`,
      select: "*,tool_calls(*),bookings(*)",
      "tool_calls.order": "created_at.asc",
      "bookings.order": "starts_at.asc",
    });
    const [row] = rows.parse(await this.request(`/calls?${params}`));

    if (!row) {
      return null;
    }

    return {
      ...fromDb<CallRow>(row, CALL_COLUMNS),
      toolCalls: rows
        .parse(row.tool_calls ?? [])
        .map((t) => fromDb<ToolCallRow>(t, TOOL_CALL_COLUMNS)),
      bookings: rows.parse(row.bookings ?? []).map((b) => fromDb<BookingRow>(b, BOOKING_COLUMNS)),
    };
  }
}
