import type {
  BookingRow,
  CallDetail,
  CallRow,
  CallStore,
  CallSummary,
  CallUpdate,
  NewBooking,
  ToolCallRow,
  ToolCallUpdate,
} from "./types.ts";

const MAX_CALLS = 500;

const defined = <T extends object>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;

export class InMemoryCallStore implements CallStore {
  readonly kind = "memory";
  private readonly now: () => Date;
  private readonly calls = new Map<string, CallRow>();
  private readonly toolCalls = new Map<string, ToolCallRow>();
  private readonly bookings = new Map<string, BookingRow>();

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  private newCall(id: string): CallRow {
    return {
      id,
      status: "in-progress",
      type: null,
      customerNumber: null,
      startedAt: this.now().toISOString(),
      endedAt: null,
      durationSeconds: null,
      endedReason: null,
      outcome: null,
      summary: null,
      transcript: [],
      recordingUrl: null,
      cost: null,
    };
  }

  async openCall(call: CallUpdate): Promise<void> {
    if (this.calls.has(call.id)) return;
    this.calls.set(call.id, { ...this.newCall(call.id), ...defined(call) });
    this.trim();
  }

  async saveCall(call: CallUpdate): Promise<void> {
    const current = this.calls.get(call.id) ?? this.newCall(call.id);
    this.calls.set(call.id, { ...current, ...defined(call) });
    this.trim();
  }

  async saveToolCalls(rows: ToolCallUpdate[]): Promise<void> {
    for (const row of rows) {
      if (!this.calls.has(row.callId)) {
        throw new Error(`tool call ${row.id}: call ${row.callId} does not exist`);
      }
    }
    for (const row of rows) {
      const current: ToolCallRow = this.toolCalls.get(row.id) ?? {
        id: row.id,
        callId: row.callId,
        name: row.name,
        arguments: {},
        result: null,
        error: null,
        durationMs: null,
        secondsFromStart: null,
        createdAt: this.now().toISOString(),
      };
      this.toolCalls.set(row.id, { ...current, ...defined(row) });
    }
  }

  async saveBooking(booking: NewBooking): Promise<void> {
    if (booking.callId && !this.calls.has(booking.callId)) {
      throw new Error(`booking ${booking.id}: call ${booking.callId} does not exist`);
    }

    const createdAt = this.bookings.get(booking.id)?.createdAt ?? this.now().toISOString();
    this.bookings.set(booking.id, { ...booking, createdAt });
  }

  async listCalls(limit: number): Promise<CallSummary[]> {
    return this.newestFirst()
      .slice(0, limit)
      .map(({ transcript: _t, recordingUrl: _r, cost: _c, ...summary }) =>
        structuredClone(summary),
      );
  }

  async getCall(id: string): Promise<CallDetail | null> {
    const call = this.calls.get(id);

    if (!call) return null;

    const toolCalls = [...this.toolCalls.values()]
      .filter((t) => t.callId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const bookings = [...this.bookings.values()]
      .filter((b) => b.callId === id)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    return structuredClone({ ...call, toolCalls, bookings });
  }

  private newestFirst(): CallRow[] {
    return [...this.calls.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  private trim() {
    if (this.calls.size <= MAX_CALLS) return;

    for (const old of this.newestFirst().slice(MAX_CALLS)) {
      this.calls.delete(old.id);
      for (const [key, t] of this.toolCalls) if (t.callId === old.id) this.toolCalls.delete(key);
      for (const b of this.bookings.values()) if (b.callId === old.id) b.callId = null;
    }
  }
}
